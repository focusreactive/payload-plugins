import type { Access, CollectionSlug, Endpoint, PayloadRequest } from "payload";

import { ENDPOINT, KV_PREFIX, START_LOCK_MS, TITLE_PREFIX } from "./lib/constants.js";
import { NetlifyError, netlifyClient } from "./lib/netlify.js";
import type { NetlifyClient, NetlifyDeploy, NetlifySite } from "./lib/netlify.js";
import { isRunning, phaseOf, summarize } from "./lib/status.js";
import type { BuildRecord } from "./lib/status.js";
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

// The name the admin shows for the user — their collection's `useAsTitle` — and the email when
// that field is empty.
const userName = (req: PayloadRequest) => {
  const user = req.user as (Record<string, unknown> & { collection?: string }) | null;
  if (!user) {
    return "someone";
  }
  const field = user.collection
    ? req.payload.collections[user.collection as CollectionSlug]?.config.admin?.useAsTitle
    : undefined;
  const name = field && field !== "id" ? user[field] : undefined;
  return typeof name === "string" && name ? name : String(user.email ?? user.id ?? "someone");
};

const allowed = async (check: Access | undefined, req: PayloadRequest) =>
  check ? (await check({ req })) === true : Boolean(req.user);

const buildKey = (deployId: string) => `${KV_PREFIX}:build:${deployId}`;
const lockKey = (siteId: string) => `${KV_PREFIX}:starting:${siteId}`;

const recordOf = async (req: PayloadRequest, deployId: string): Promise<BuildRecord> =>
  (await req.payload.kv.get<{ by: string }>(buildKey(deployId)).catch(() => null)) ?? null;

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
        const records = await Promise.all(deploys.map((deploy) => recordOf(req, deploy.id)));
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
          current:
            phase === "idle" || !deploys[0]
              ? null
              : summarize(deploys[0], site, records[0] ?? null),
          recent: deploys
            .slice(0, 5)
            .map((deploy, index) => summarize(deploy, site, records[index] ?? null)),
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
        // A build Netlify accepted takes a moment to show in its list, so a second click in that
        // window would start a second build; the lock covers it.
        const startedAt = await req.payload.kv.get<number>(lockKey(site.id)).catch(() => null);
        if (startedAt && Date.now() - startedAt < START_LOCK_MS) {
          return fail("A build of this site is being started.", 409);
        }
        const deploys = await api.deploys(site.id, 5);
        if (deploys.some(isRunning)) {
          return fail("A build of this site is already running.", 409);
        }
        await req.payload.kv.set(lockKey(site.id), Date.now());
        // A site whose builds are stopped (so pushes do not deploy by themselves) builds only while
        // they are allowed; they are stopped again as soon as the build is queued.
        const stopped = Boolean(site.build_settings?.stop_builds);
        let build: { deploy_id: string };
        try {
          if (stopped) {
            await api.stopBuilds(site.id, false);
          }
          build = await api.build(site.id, `${TITLE_PREFIX} · ${userName(req)}`);
        } catch (error) {
          await req.payload.kv.delete(lockKey(site.id)).catch(() => undefined);
          throw error;
        } finally {
          if (stopped) {
            await api.stopBuilds(site.id, true);
          }
        }
        await req.payload.kv.set(buildKey(build.deploy_id), { by: userName(req) });
        await notify(options.onBuild, context, build.deploy_id);
        return json({ deployId: build.deploy_id });
      }),
    },
    {
      // Throws the build away: a running one is cancelled, a finished preview is deleted from
      // Netlify, so nobody is offered it again. What is live is never touched.
      path: `${ENDPOINT}/discard`,
      method: "post",
      handler: handle(async (context) => {
        if (!(await allowed(options.access?.build, context.req))) {
          return fail("You are not allowed to discard a build.", 403);
        }
        const deploy = await deployOf(context, (await readBody(context.req)).deployId);
        if (!deploy) {
          return fail("No such deploy on this site.", 404);
        }
        if (deploy.id === context.site.published_deploy?.id || deploy.published_at) {
          return fail("A published deploy cannot be discarded.", 409);
        }
        if (isRunning(deploy)) {
          await context.api.cancel(deploy.id);
        } else {
          await context.api.remove(context.site.id, deploy.id);
          await context.req.payload.kv.delete(buildKey(deploy.id)).catch(() => undefined);
        }
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
