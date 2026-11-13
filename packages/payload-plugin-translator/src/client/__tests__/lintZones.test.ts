import { spawnSync } from "node:child_process";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

/**
 * Puts a file that breaks (or keeps) each client zone where the zone applies, lints it with the
 * repo config from the repo root, and reads whether `no-restricted-imports` refused it.
 */
const CLIENT = join(dirname(fileURLToPath(import.meta.url)), "..");
const REPO_ROOT = join(CLIENT, "..", "..", "..", "..");
const PROBE_FOLDER = `__lint_probe_${process.pid}__`;

/** Lint reads specifiers as text; every probe target lies outside src/client, so the layer scan never sees a probe. */
const OUTSIDE = "../../../../../../../outside";

type Probe = {
  zone: string;
  /** The folder under src/client the probe stands in. */
  at: string;
  file: string;
  specifier: string;
  typeOnly?: boolean;
  refused: boolean;
};

const PROBES: Probe[] = [
  {
    zone: "C1",
    at: "shared",
    file: "core.ts",
    specifier: `${OUTSIDE}/core/domain/x.js`,
    refused: true,
  },
  {
    zone: "C1",
    at: "app",
    file: "server.ts",
    specifier: `${OUTSIDE}/server/shared/x.js`,
    refused: true,
  },
  {
    zone: "C1",
    at: "features",
    file: "composition.ts",
    specifier: `${OUTSIDE}/composition/x.js`,
    refused: true,
  },
  {
    zone: "C1",
    at: "widgets",
    file: "typesValue.ts",
    specifier: `${OUTSIDE}/types/AccessGuard.js`,
    refused: true,
  },
  {
    zone: "C1",
    at: "widgets",
    file: "typesType.ts",
    specifier: `${OUTSIDE}/types/AccessGuard.js`,
    typeOnly: true,
    refused: false,
  },
  {
    zone: "C1",
    at: "widgets",
    file: "wireValue.ts",
    specifier: `${OUTSIDE}/types/wire/endpoints.js`,
    refused: false,
  },
  {
    zone: "C2",
    at: "entities",
    file: "app.ts",
    specifier: `${OUTSIDE}/app/config/x.js`,
    refused: true,
  },
  {
    zone: "C2",
    at: "shared",
    file: "entities.ts",
    specifier: `${OUTSIDE}/entities/translation/x.js`,
    refused: true,
  },
  {
    zone: "C2",
    at: "features",
    file: "widgets.ts",
    specifier: `${OUTSIDE}/widgets/x/index.js`,
    refused: true,
  },
  {
    zone: "C2",
    at: "features",
    file: "features.ts",
    specifier: `${OUTSIDE}/features/x/index.js`,
    refused: true,
  },
  {
    zone: "C2",
    at: "widgets",
    file: "widgets.ts",
    specifier: `${OUTSIDE}/widgets/x/index.js`,
    refused: true,
  },
  {
    zone: "C2",
    at: "widgets",
    file: "features.ts",
    specifier: `${OUTSIDE}/features/x/index.js`,
    refused: false,
  },
  {
    zone: "C2",
    at: "entities",
    file: "entityType.ts",
    specifier: `${OUTSIDE}/entities/other/x.js`,
    typeOnly: true,
    refused: false,
  },
  {
    zone: "C2",
    at: "entities",
    file: "entityValue.ts",
    specifier: `${OUTSIDE}/entities/other/x.js`,
    refused: true,
  },
  {
    zone: "C3",
    at: "widgets",
    file: "p.server.ts",
    specifier: `${OUTSIDE}/server/shared/index.js`,
    refused: false,
  },
  {
    zone: "C3",
    at: "widgets",
    file: "p.export.ts",
    specifier: `${OUTSIDE}/core/domain/x.js`,
    refused: false,
  },
  {
    zone: "C3",
    at: "widgets",
    file: "q.server.tsx",
    specifier: `${OUTSIDE}/server/modules/x.js`,
    refused: true,
  },
  {
    zone: "C3",
    at: "widgets",
    file: "q.export.tsx",
    specifier: `${OUTSIDE}/app/x.js`,
    refused: true,
  },
  {
    zone: "C4",
    at: "entities/translation/model",
    file: "ui.ts",
    specifier: "@payloadcms/ui",
    refused: true,
  },
  {
    zone: "C4",
    at: "entities/translation/model",
    file: "payloadType.ts",
    specifier: "payload",
    typeOnly: true,
    refused: false,
  },
  {
    zone: "C4",
    at: "entities/translation/api",
    file: "payloadValue.ts",
    specifier: "payload",
    refused: true,
  },
  {
    zone: "C4",
    at: "entities/translation/ui",
    file: "ui.ts",
    specifier: "@payloadcms/ui",
    refused: false,
  },
  { zone: "C5", at: "features", file: "ofetch.ts", specifier: "ofetch", refused: true },
  { zone: "C5", at: "shared/api", file: "ofetch.ts", specifier: "ofetch", refused: false },
  {
    zone: "C5",
    at: "entities/translation/api",
    file: "ofetch.ts",
    specifier: "ofetch",
    refused: false,
  },
  {
    zone: "tests",
    at: "features",
    file: "__tests__/server.ts",
    specifier: `${OUTSIDE}/server/modules/x.js`,
    refused: false,
  },
];

const probeDir = (probe: Probe): string => join(CLIENT, probe.at, PROBE_FOLDER);
const probePath = (probe: Probe): string => join(probeDir(probe), probe.file);

const sourceOf = ({ specifier, typeOnly }: Probe): string =>
  typeOnly
    ? `import type { Probe } from "${specifier}";\nexport type Used = Probe;\n`
    : `import { probe } from "${specifier}";\nexport const used = probe;\n`;

type Diagnostic = { code: string; filename: string };

let refusedFiles = new Set<string>();

describe("the client lint zones", () => {
  beforeAll(() => {
    for (const probe of PROBES) {
      mkdirSync(dirname(probePath(probe)), { recursive: true });
      writeFileSync(probePath(probe), sourceOf(probe));
    }
    const lint = spawnSync(
      join(REPO_ROOT, "node_modules", ".bin", "oxlint"),
      [
        "-c",
        "oxlint.config.ts",
        "-f",
        "json",
        ...new Set(PROBES.map((p) => relative(REPO_ROOT, probeDir(p)))),
      ],
      { cwd: REPO_ROOT, encoding: "utf-8" }
    );
    const { diagnostics } = JSON.parse(lint.stdout) as { diagnostics: Diagnostic[] };
    refusedFiles = new Set(
      diagnostics.filter((d) => d.code === "eslint(no-restricted-imports)").map((d) => d.filename)
    );
  }, 60_000);

  afterAll(() => {
    for (const probe of PROBES) rmSync(probeDir(probe), { recursive: true, force: true });
  });

  it.each(PROBES.map((p) => [p.zone, p.refused ? "refuses" : "allows", p.at, p.file, p] as const))(
    "%s %s %s/%s",
    (_zone, _verdict, _at, _file, probe) => {
      expect(refusedFiles.has(relative(REPO_ROOT, probePath(probe))), probe.specifier).toBe(
        probe.refused
      );
    }
  );
});
