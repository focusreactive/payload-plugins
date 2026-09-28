import type { Access, CollectionSlug, Endpoint, PayloadRequest } from "payload";

import { ENDPOINT, TITLE_PREFIX } from "./lib/constants.js";
import { NetlifyError, netlifyClient } from "./lib/netlify.js";
import type { NetlifyClient, NetlifyDeploy, NetlifySite } from "./lib/netlify.js";
import { isRunning, phaseOf, summarize } from "./lib/status.js";
import type {
  DeployLog,
  DeployStatus,
  NetlifyDeployOptions,
  SiteArgs,
  SiteTarget,
} from "./types.js";

const json = (body: unknown, status = 200) =>
  Response.json(body, { status, headers: { "Cache-Control": "no-store" } });

const fail = (message: string, status: number) => json({ errors: [{ message }] }, status);

type Context = {
  req: PayloadRequest;
  api: NetlifyClient;
  site: NetlifySite;
  target: SiteTarget & Omit<SiteArgs, "req">;
};

const readBody = async (req: PayloadRequest): Promise<Record<string, unknown>> => {
  const body = typeof req.json === "function" ? await req.json().catch(() => null) : null;
  return body && typeof body === "object" ? body : {};
};

const siteUrl = (site: NetlifySite) =>
  site.ssl_url ?? site.url ?? `https://${site.name}.netlify.app`;

const userName = (req: PayloadRequest) => {
  const user = req.user as { email?: string; id?: string | number } | null;
  return user?.email ?? String(user?.id ?? "someone");
};

const allowed = async (check: Access | undefined, req: PayloadRequest) =>
  check ? (await check({ req })) === true : Boolean(req.user);

// A deploy named in a request must belong to the site the document resolved to.
const deployOf = async ({ api, site }: Context, deployId: unknown) => {
  if (typeof deployId !== "string" || !deployId) {
    return null;
  }
  const deploy = await api.deploy(deployId).catch(() => null);
  return deploy && deploy.site_id === site.id ? deploy : null;
};

export const deployEndpoints = (options: NetlifyDeployOptions): Endpoint[] => {
  // The site comes from the document, never from the request: a caller can only reach a site the
  // configuration hands it.
  const resolve = async (req: PayloadRequest): Promise<Context["target"] | null> => {
    const params = new URL(req.url || "", "http://internal").searchParams;
    const collection = (params.get("collection") as CollectionSlug | null) || null;
    const id = params.get("id") || null;
    if (collection && !options.collections?.includes(collection)) {
      return null;
    }
    const target =
      typeof options.site === "string"
        ? { site: options.site }
        : await options.site({ req, collection, id });
    return target ? { ...target, collection, id } : null;
  };

  const handle =
    (run: (context: Context) => Promise<Response>) =>
    async (req: PayloadRequest): Promise<Response> => {
      if (!req.user) {
        return fail("Forbidden.", 403);
      }
      if (!options.token) {
        return fail("The Netlify token is not configured.", 500);
      }
      try {
        const target = await resolve(req);
        if (!target) {
          return fail("There is no Netlify site for this document.", 404);
        }
        const api = netlifyClient(options.token);
        const site = await api.site(target.site);
        return await run({ req, api, site, target });
      } catch (error) {
        req.payload.logger.error({ err: error, msg: "netlify-deploy request failed" });
        const message = error instanceof Error ? error.message : "The request to Netlify failed.";
        // Netlify's own 401/403 are about the token, not the editor — the admin must not read them as a lost session.
        return fail(message, error instanceof NetlifyError && error.status === 404 ? 404 : 502);
      }
    };

  const event = (context: Context, deployId: string) => ({
    req: context.req,
    site: { id: context.site.id, name: context.site.name, url: siteUrl(context.site) },
    deployId,
  });

  const notify = async (hook: typeof options.onBuild, context: Context, deployId: string) => {
    try {
      await hook?.(event(context, deployId));
    } catch (error) {
      context.req.payload.logger.error({ err: error, msg: "netlify-deploy hook failed" });
    }
  };

  return [
    {
      path: `${ENDPOINT}/status`,
      method: "get",
      handler: handle(async ({ req, api, site, target }) => {
        const deploys: NetlifyDeploy[] = await api.deploys(site.id, 8);
        const phase = phaseOf(deploys[0], site);
        const publishedAt = site.published_deploy?.published_at ?? null;
        // What is live was read from Payload when its build started, not when it was published: a
        // save made while that build ran is not on the site, so it still counts as waiting.
        const liveBuildStartedAt =
          deploys.find((deploy) => deploy.id === site.published_deploy?.id)?.created_at ??
          site.published_deploy?.created_at ??
          publishedAt;
        const changes = options.changes
          ? await options.changes({
              req,
              collection: target.collection,
              id: target.id,
              since: liveBuildStartedAt ? new Date(liveBuildStartedAt) : null,
            })
          : [];
        const body: DeployStatus = {
          site: {
            name: site.name,
            url: siteUrl(site),
            adminUrl: site.admin_url ?? null,
            locked: Boolean(site.published_deploy?.locked),
          },
          note: target.note ?? null,
          lastPublishedAt: publishedAt,
          phase,
          current: phase === "idle" || !deploys[0] ? null : summarize(deploys[0], site),
          recent: deploys.slice(0, 5).map((deploy) => summarize(deploy, site)),
          changes,
          can: {
            build: await allowed(options.access?.build, req),
            publish: await allowed(options.access?.publish, req),
          },
        };
        return json(body);
      }),
    },
    {
      path: `${ENDPOINT}/build`,
      method: "post",
      handler: handle(async (context) => {
        const { req, api, site } = context;
        if (!(await allowed(options.access?.build, req))) {
          return fail("You are not allowed to start a build.", 403);
        }
        const deploys = await api.deploys(site.id, 5);
        if (deploys.some(isRunning)) {
          return fail("A build of this site is already running.", 409);
        }
        // A site whose builds are stopped (so pushes do not deploy by themselves) builds only while
        // they are allowed; they are stopped again as soon as the build is queued.
        const stopped = Boolean(site.build_settings?.stop_builds);
        if (stopped) {
          await api.stopBuilds(site.id, false);
        }
        let build: { deploy_id: string };
        try {
          build = await api.build(site.id, `${TITLE_PREFIX} · ${userName(req)}`);
        } finally {
          if (stopped) {
            await api.stopBuilds(site.id, true);
          }
        }
        await notify(options.onBuild, context, build.deploy_id);
        return json({ deployId: build.deploy_id });
      }),
    },
    {
      path: `${ENDPOINT}/cancel`,
      method: "post",
      handler: handle(async (context) => {
        if (!(await allowed(options.access?.build, context.req))) {
          return fail("You are not allowed to cancel a build.", 403);
        }
        const deploy = await deployOf(context, (await readBody(context.req)).deployId);
        if (!deploy) {
          return fail("No such deploy on this site.", 404);
        }
        await context.api.cancel(deploy.id);
        return json({ ok: true });
      }),
    },
    {
      path: `${ENDPOINT}/publish`,
      method: "post",
      handler: handle(async (context) => {
        if (!(await allowed(options.access?.publish, context.req))) {
          return fail("You are not allowed to publish.", 403);
        }
        const deploy = await deployOf(context, (await readBody(context.req)).deployId);
        if (!deploy) {
          return fail("No such deploy on this site.", 404);
        }
        if (deploy.state !== "ready") {
          return fail("Only a finished build can be published.", 409);
        }
        await context.api.publish(context.site.id, deploy.id);
        await notify(options.onPublish, context, deploy.id);
        return json({ ok: true });
      }),
    },
    {
      path: `${ENDPOINT}/log`,
      method: "get",
      handler: handle(async (context) => {
        const deployId = new URL(context.req.url || "", "http://internal").searchParams.get(
          "deploy"
        );
        const deploy = await deployOf(context, deployId);
        if (!deploy) {
          return fail("No such deploy on this site.", 404);
        }
        const { lines, done } = await context.api.log(context.site.id, deploy.id);
        const body: DeployLog = { lines: lines.slice(-500), done };
        return json(body);
      }),
    },
  ];
};
