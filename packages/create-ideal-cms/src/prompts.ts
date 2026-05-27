import { cancel, confirm, intro, isCancel, log, outro, password, select, text } from "@clack/prompts";
import { randomBytes } from "node:crypto";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import pc from "picocolors";
import type { TemplateSource } from "./scaffold.js";

export type PackageManager = "bun" | "pnpm" | "npm" | "skip";

export type Answers = {
  projectName: string;
  targetDir: string;
  primaryColor: string;
  databaseUrl: string;
  payloadSecret: string;
  publicServerUrl: string;
  openaiApiKey: string;
  blobToken: string;
  oidcIssuer: string;
  oidcClientId: string;
  oidcClientSecret: string;
  initGit: boolean;
  packageManager: PackageManager;
  source: TemplateSource;
  runInitialMigration: boolean;
};

const HEX_RE = /^#[0-9a-fA-F]{6}$/u;
const PROJECT_RE = /^[a-z0-9](?:[a-z0-9-_]*[a-z0-9])?$/u;

function bail(): never {
  cancel("Cancelled");
  process.exit(0);
}

function unwrap<T>(value: T | symbol): T {
  if (isCancel(value)) {
    bail();
  }
  return value as T;
}

export async function collectAnswers(argv: { name?: string; ref?: string; fromLocal?: string }): Promise<Answers> {
  intro(pc.bgCyan(pc.black(" create-ideal-cms ")));
  log.message("Scaffolds a Payload CMS monorepo preconfigured with @focus-reactive plugins.");

  const projectName = unwrap(
    await text({
      message: "Project name",
      placeholder: "my-ideal-cms",
      initialValue: argv.name,
      validate: (value) => {
        if (!value) return "Required.";
        if (!PROJECT_RE.test(value)) return "Use lowercase letters, digits, dashes, or underscores.";
        const target = resolve(process.cwd(), value);
        if (existsSync(target)) return `Directory "${value}" already exists.`;
        return;
      },
    })
  );

  const primaryColor = unwrap(
    await text({
      message: "Primary brand color (hex)",
      placeholder: "#ff5b1f",
      initialValue: "#ff5b1f",
      validate: (value) => {
        if (!value) return "Required.";
        if (!HEX_RE.test(value)) return "Use a 6-digit hex like #ff5b1f.";
        return;
      },
    })
  );

  const databaseUrl = unwrap(
    await text({
      message: "Postgres connection string (DATABASE_URL)",
      placeholder: `postgres://127.0.0.1:5432/${projectName}`,
      initialValue: `postgres://127.0.0.1:5432/${projectName}`,
      validate: (value) => (value ? undefined : "Required."),
    })
  );

  const publicServerUrl = unwrap(
    await text({
      message: "Public server URL (NEXT_PUBLIC_SERVER_URL)",
      placeholder: "http://localhost:3333",
      initialValue: "http://localhost:3333",
      validate: (value) => (value ? undefined : "Required."),
    })
  );

  const wantsOpenai = unwrap(
    await confirm({
      message: "Add an OpenAI API key now? (for AI SEO + translator)",
      initialValue: false,
    })
  );
  const openaiApiKey = wantsOpenai
    ? unwrap(
        await password({
          message: "OPENAI_API_KEY",
          mask: "*",
        })
      )
    : "";

  const wantsBlob = unwrap(
    await confirm({
      message: "Add a Vercel Blob token now? (for media uploads)",
      initialValue: false,
    })
  );
  const blobToken = wantsBlob
    ? unwrap(
        await password({
          message: "BLOB_READ_WRITE_TOKEN",
          mask: "*",
        })
      )
    : "";

  const wantsOidc = unwrap(
    await confirm({
      message: "Configure OIDC SSO now? (Auth0, Keycloak, Okta…)",
      initialValue: false,
    })
  );

  let oidcIssuer = "";
  let oidcClientId = "";
  let oidcClientSecret = "";
  if (wantsOidc) {
    oidcIssuer = unwrap(
      await text({
        message: "OIDC_ISSUER",
        placeholder: "https://your-tenant.auth0.com",
      })
    );
    oidcClientId = unwrap(
      await text({
        message: "OIDC_CLIENT_ID",
      })
    );
    oidcClientSecret = unwrap(
      await password({
        message: "OIDC_CLIENT_SECRET",
        mask: "*",
      })
    );
  }

  const runInitialMigration = unwrap(
    await confirm({
      message: "Run an initial database migration after install? (requires DATABASE_URL to be reachable)",
      initialValue: true,
    })
  );

  const initGit = unwrap(
    await confirm({
      message: "Initialize a git repository?",
      initialValue: true,
    })
  );

  const packageManager = unwrap(
    await select<PackageManager>({
      message: "Install dependencies with…",
      initialValue: "bun",
      options: [
        { value: "bun", label: "bun", hint: "recommended" },
        { value: "pnpm", label: "pnpm" },
        { value: "npm", label: "npm" },
        { value: "skip", label: "skip — install manually later" },
      ],
    })
  );

  const source: TemplateSource = argv.fromLocal ? { kind: "local", path: resolve(process.cwd(), argv.fromLocal) } : { kind: "github", ref: argv.ref ?? "main" };

  return {
    projectName,
    targetDir: resolve(process.cwd(), projectName),
    primaryColor: primaryColor.toLowerCase(),
    databaseUrl,
    payloadSecret: randomBytes(32).toString("hex"),
    publicServerUrl,
    openaiApiKey,
    blobToken,
    oidcIssuer,
    oidcClientId,
    oidcClientSecret,
    initGit,
    packageManager,
    source,
    runInitialMigration,
  };
}

export { outro };
