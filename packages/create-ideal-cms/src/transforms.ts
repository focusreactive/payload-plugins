import { readFile, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import type { Answers } from "./prompts.js";

// Premium plugins that require a FocusReactive private-registry token. Without one,
// the scaffold strips them out entirely rather than shipping a project that fails
// `bun install` for anyone without @fr-private access.
const PRIVATE_PLUGIN_DEPENDENCY = "@fr-private/payload-plugin-visual-editing";

// Plugins that ship as `workspace:*` in the source monorepo and need a real
// version range in the scaffold output. Pinned exactly to match the source's
// "exact-version" style. Bump when a new plugin version ships.
const PLUGIN_VERSIONS: Record<string, string> = {
  "@focus-reactive/payload-plugin-ab": "2.6.0",
  "@focus-reactive/payload-plugin-analytics": "1.2.2",
  "@focus-reactive/payload-plugin-comments": "1.8.0",
  "@focus-reactive/payload-plugin-presets": "0.11.0",
  "@focus-reactive/payload-plugin-scheduling": "1.2.0",
  "@focus-reactive/payload-plugin-seo": "1.10.1",
  "@focus-reactive/payload-plugin-translator": "0.2.0",
};

type Pkg = Record<string, unknown> & {
  name?: string;
  scripts?: Record<string, string>;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
};

async function readJson<T>(file: string): Promise<T> {
  return JSON.parse(await readFile(file, "utf-8")) as T;
}

async function writeJson(file: string, data: unknown): Promise<void> {
  await writeFile(file, `${JSON.stringify(data, null, 2)}\n`);
}

function rewritePluginRefs(deps: Record<string, string> | undefined): void {
  if (!deps) return;
  for (const [name, range] of Object.entries(deps)) {
    if (range === "workspace:*" && PLUGIN_VERSIONS[name]) {
      deps[name] = PLUGIN_VERSIONS[name];
    }
  }
}

async function transformRootPackageJson(targetDir: string, answers: Answers): Promise<void> {
  const file = join(targetDir, "package.json");
  const pkg = await readJson<Pkg>(file);

  pkg.name = answers.projectName;

  if (pkg.scripts) {
    delete pkg.scripts.release;
    // Source's prepare runs `lefthook install`, which fails without a git repo
    // and crashes downstream `bun install`. Users opt in by running `lefthook install`.
    delete pkg.scripts.prepare;
  }
  if (pkg.devDependencies) {
    for (const dep of Object.keys(pkg.devDependencies)) {
      if (dep.startsWith("@semantic-release/") || dep === "multi-semantic-release") {
        // oxlint-disable-next-line typescript/no-dynamic-delete
        delete pkg.devDependencies[dep];
      }
    }
  }

  await writeJson(file, pkg);
}

async function transformCmsPackageJson(targetDir: string): Promise<void> {
  const file = join(targetDir, "apps/cms/package.json");
  const pkg = await readJson<Pkg>(file);
  rewritePluginRefs(pkg.dependencies);
  rewritePluginRefs(pkg.devDependencies);
  await writeJson(file, pkg);
}

async function applyTextReplacements(
  file: string,
  replacements: [string, string][]
): Promise<void> {
  let content = await readFile(file, "utf-8");
  for (const [find, replace] of replacements) {
    if (!content.includes(find)) {
      throw new Error(`create-ideal-cms: expected to find this in ${file}:\n${find}`);
    }
    content = content.replace(find, replace);
  }
  await writeFile(file, content);
}

async function stripPrivatePlugins(targetDir: string): Promise<void> {
  const cmsPkgFile = join(targetDir, "apps/cms/package.json");
  const cmsPkg = await readJson<Pkg>(cmsPkgFile);
  if (cmsPkg.dependencies) {
    // oxlint-disable-next-line typescript/no-dynamic-delete
    delete cmsPkg.dependencies[PRIVATE_PLUGIN_DEPENDENCY];
  }
  await writeJson(cmsPkgFile, cmsPkg);

  await applyTextReplacements(join(targetDir, "apps/cms/src/lib/plugins/index.ts"), [
    ['import { visualEditingPlugin } from "@fr-private/payload-plugin-visual-editing";\n', ""],
    [
      `
  visualEditingPlugin({
    adminBasePath: "/admin",
    skipCollections: [
      "users",
      "media",
      "categories",
      "authors",
      "testimonials",
      "header",
      "footer",
      "document-embeddings",
      "redirects",
      "presets",
      "comments",
      "comment-reads",
      "ab-experiments",
      "payload-mcp-api-keys",
    ],
    skipGlobals: ["site-settings"],
  }),
`,
      "",
    ],
  ]);

  await applyTextReplacements(join(targetDir, "apps/cms/src/app/(frontend)/[locale]/layout.tsx"), [
    ['import { VisualEditing } from "@fr-private/payload-plugin-visual-editing/client";\n\n', ""],
    ['import { VisualEditingEditRouter } from "@/components/VisualEditingEditRouter";\n', ""],
    [
      `            {draft ? (
              <VisualEditing.Provider available adminBasePath="/admin">
                <VisualEditing.Toggle />
                <VisualEditing.Overlay locale={locale}>{children}</VisualEditing.Overlay>
                <LivePreviewListener />
                <VisualEditingEditRouter />
              </VisualEditing.Provider>
            ) : (
              children
            )}`,
      `            {draft ? (
              <>
                <LivePreviewListener />
                {children}
              </>
            ) : (
              children
            )}`,
    ],
  ]);

  await applyTextReplacements(
    join(targetDir, "apps/cms/src/components/shared/RichText/index.tsx"),
    [
      [
        'import { withVisualEditingPath } from "@fr-private/payload-plugin-visual-editing/client";\n',
        "",
      ],
      [
        `  return (
    <div {...withVisualEditingPath(content)}>
      <RichTextReact
        className={cn(proseVariants({ variant }), className)}
        converters={createJsxConverters(variant)}
        data={content}
      />
    </div>
  );`,
        `  return (
    <RichTextReact
      className={cn(proseVariants({ variant }), className)}
      converters={createJsxConverters(variant)}
      data={content}
    />
  );`,
      ],
    ]
  );

  await applyTextReplacements(join(targetDir, "apps/cms/src/lib/adapters/prepareMediaProps.ts"), [
    [
      'import { withVisualEditingPath } from "@fr-private/payload-plugin-visual-editing/client";\n\n',
      "",
    ],
    [
      `  const visualEditing = withVisualEditingPath(image);
  const media = image && typeof image === "object" ? image : null;`,
      `  const media = image && typeof image === "object" ? image : null;`,
    ],
    [
      `      data: { kind: "video", src: getMediaUrl(src) },
      visualEditing,
    };`,
      `      data: { kind: "video", src: getMediaUrl(src) },
    };`,
    ],
    [
      `    },
    visualEditing,
    imageProps,
  };`,
      `    },
    imageProps,
  };`,
    ],
  ]);

  await applyTextReplacements(join(targetDir, "apps/cms/src/app/(payload)/admin/importMap.js"), [
    [
      "import { VisualEditingBridgeProvider as VisualEditingBridgeProvider_673e524fc3ed2dc6764c4e182a583baf } from '@fr-private/payload-plugin-visual-editing/admin'\n",
      "",
    ],
    [
      '  "@fr-private/payload-plugin-visual-editing/admin#VisualEditingBridgeProvider": VisualEditingBridgeProvider_673e524fc3ed2dc6764c4e182a583baf,\n',
      "",
    ],
  ]);

  await rm(join(targetDir, "apps/cms/src/components/VisualEditingEditRouter"), {
    recursive: true,
    force: true,
  });
}

async function writePrivateRegistryNpmrc(targetDir: string): Promise<void> {
  // References NPM_TOKEN rather than embedding the token literally, so `git init && git add .`
  // downstream (initGit) can't commit the secret into the scaffolded project's history.
  const content = `@fr-private:registry=https://registry.npmjs.org/\n//registry.npmjs.org/:_authToken=\${NPM_TOKEN}\n`;
  await writeFile(join(targetDir, ".npmrc"), content);
}

function escapeEnvValue(value: string): string {
  if (value === "") return "";
  return `'${value.replace(/'/gu, "'\\''")}'`;
}

function envLine(key: string, value: string, optional = false): string {
  if (optional && value === "") return `# ${key}=`;
  return `${key}=${escapeEnvValue(value)}`;
}

async function writeEnvFile(targetDir: string, answers: Answers): Promise<void> {
  const lines = [
    "# Generated by create-ideal-cms",
    envLine("DATABASE_URL", answers.databaseUrl),
    envLine("PAYLOAD_SECRET", answers.payloadSecret),
    envLine("NEXT_PUBLIC_SERVER_URL", answers.publicServerUrl),
    "",
    "# Used to validate preview requests",
    envLine("PREVIEW_SECRET", answers.payloadSecret.slice(0, 32)),
    "",
    "# Vercel Blob Storage (for media uploads)",
    envLine("BLOB_READ_WRITE_TOKEN", answers.blobToken, true),
    "",
    "# AI SEO + translator. The translator plugin instantiates OpenAI at config-load,",
    "# so a non-empty value is required for payload to boot. Replace with a real key",
    "# from https://platform.openai.com/api-keys to actually use these features.",
    envLine("OPENAI_API_KEY", answers.openaiApiKey || "sk-placeholder-replace-with-real-key"),
    "",
    "# OIDC SSO (optional)",
    envLine("OIDC_ISSUER", answers.oidcIssuer, true),
    envLine("OIDC_CLIENT_ID", answers.oidcClientId, true),
    envLine("OIDC_CLIENT_SECRET", answers.oidcClientSecret, true),
    "",
  ];
  await writeFile(join(targetDir, "apps/cms/.env"), `${lines.join("\n")}\n`);
}

const PLUGINS: { name: string; detail: string }[] = [
  {
    name: "A/B Testing",
    detail: "native experiments with a dynamic percentage of traffic per variant",
  },
  {
    name: "Analytics",
    detail: "GA4 dashboard in the admin, client tracking, optional A/B tab",
  },
  { name: "SEO", detail: "live Yoast analysis in the editor, SERP preview" },
  { name: "Presets", detail: "save and apply reusable block configurations" },
  { name: "Comments", detail: "inline field comments, mentions, and annotations" },
  {
    name: "AI Translation",
    detail: "one-click translations on top of Payload's localization",
  },
  {
    name: "Scheduled Publishing",
    detail: "schedule documents to publish at a future date, serverless-friendly",
  },
];

async function writeRootReadme(answers: Answers): Promise<void> {
  const pm = answers.packageManager === "skip" ? "bun" : answers.packageManager;
  const plugins = [...PLUGINS];
  if (answers.privateRegistryToken) {
    plugins.push({
      name: "Visual Editing",
      detail: "click-to-edit overlay over your content in preview mode",
    });
  }

  const setupSteps: string[] = [];
  if (answers.packageManager === "skip") {
    setupSteps.push(`${pm} install`);
  }
  if (!answers.runInitialMigration) {
    setupSteps.push(`${pm} --cwd apps/cms run payload migrate:create init`);
    setupSteps.push(`${pm} --cwd apps/cms run payload migrate`);
  }
  setupSteps.push(`${pm} run dev`);

  const lines = [
    `# ${answers.projectName}`,
    "",
    "Built with **Ideal CMS** — a Payload CMS 3 + Next.js starter bundling the",
    "[FocusReactive Payload plugins](https://github.com/focusreactive/payload-plugins).",
    "",
    "## Quick Start",
    "",
    setupSteps.length > 1 ? "Finish setup and start the dev server:" : "Start the dev server:",
    "",
    "```bash",
    ...setupSteps,
    "```",
    "",
    "Then open [http://localhost:3333/admin](http://localhost:3333/admin) and create your first admin user.",
    "",
    "## Environment",
    "",
    "Configuration lives in `apps/cms/.env` (already generated). Edit it to add OpenAI, Vercel Blob, or OIDC SSO credentials later.",
    "",
    "## Plugins",
    "",
    "This project ships with:",
    "",
    ...plugins.map((p) => `- **${p.name}** — ${p.detail}`),
    "",
    "See [focusreactive/payload-plugins](https://github.com/focusreactive/payload-plugins) for full plugin docs, or to add more.",
    "",
    "## License",
    "",
    "MIT",
    "",
  ];
  await writeFile(join(answers.targetDir, "README.md"), lines.join("\n"));
}

async function overrideThemeColor(targetDir: string, hex: string): Promise<void> {
  const file = join(targetDir, "packages/tailwind-config/base.css");
  const css = await readFile(file, "utf-8");
  const overlay = `
/* create-ideal-cms: brand color overlay */
@theme {
  --color-primary: ${hex};
}
`;
  await writeFile(file, `${css.trimEnd()}\n${overlay}`);
}

export async function applyTransforms(answers: Answers): Promise<void> {
  await transformRootPackageJson(answers.targetDir, answers);
  await transformCmsPackageJson(answers.targetDir);
  if (answers.privateRegistryToken) {
    await writePrivateRegistryNpmrc(answers.targetDir);
  } else {
    await stripPrivatePlugins(answers.targetDir);
  }
  await writeEnvFile(answers.targetDir, answers);
  await overrideThemeColor(answers.targetDir, answers.primaryColor);
  await writeRootReadme(answers);
}
