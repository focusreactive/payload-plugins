// Type-checks every ```ts and ```tsx block of README.md against the package, so the README cannot
// drift from the code. Run it with `npx tsx scripts/check-readme.ts`.
//
// Each block must be a complete snippet with its imports. A block that must not compile uses another
// fence, such as ```text. The script also checks that every relative link and image exists.
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const packageDirectory = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const readmePath = path.join(packageDirectory, "README.md");

type Snippet = {
  /** The README line of the first line of code, 1-based. */
  firstLine: number;
  language: "ts" | "tsx";
  source: string;
};

const fencePattern = /^```(\S*)\s*$/u;

const extractSnippets = (lines: string[]): Snippet[] => {
  const snippets: Snippet[] = [];
  let open: { language: string; startIndex: number } | null = null;
  for (const [index, line] of lines.entries()) {
    const fence = fencePattern.exec(line);
    if (!fence) {
      continue;
    }
    if (open === null) {
      open = { language: fence[1], startIndex: index };
      continue;
    }
    if (open.language === "ts" || open.language === "tsx") {
      snippets.push({
        firstLine: open.startIndex + 2,
        language: open.language,
        source: lines.slice(open.startIndex + 1, index).join("\n"),
      });
    }
    open = null;
  }
  if (open !== null) {
    throw new Error(`README.md: the code fence on line ${open.startIndex + 1} is never closed`);
  }

  return snippets;
};

const findMissingLinks = (readme: string): string[] => {
  const missing: string[] = [];
  const withoutFences = readme.replaceAll(/^```[\s\S]*?^```/gmu, "");
  for (const match of withoutFences.matchAll(/!?\[[^\]]*\]\(([^)\s]+)\)/gu)) {
    const target = match[1];
    if (/^[a-z][a-z0-9+.-]*:|^#/iu.test(target)) {
      continue;
    }
    const filePath = target.split("#")[0];
    if (!existsSync(path.join(packageDirectory, filePath))) {
      missing.push(target);
    }
  }

  return missing;
};

const readme = readFileSync(readmePath, "utf-8");
const snippets = extractSnippets(readme.split("\n"));
if (snippets.length === 0) {
  throw new Error("README.md has no ts or tsx block to check");
}

const missingLinks = findMissingLinks(readme);
if (missingLinks.length > 0) {
  console.error(`README.md links to files that do not exist: ${missingLinks.join(", ")}`);
  process.exit(1);
}

// Inside the package so `payload`, `next` and the plugin's own `paths` resolve as they do for the
// dev app; `.run/` is git-ignored.
const runDirectory = path.join(packageDirectory, ".run");
mkdirSync(runDirectory, { recursive: true });
const workDirectory = mkdtempSync(path.join(runDirectory, "readme-check-"));

let exitCode = 0;
try {
  const fileNames: string[] = [];
  for (const snippet of snippets) {
    const fileName = `snippet-line-${snippet.firstLine}.${snippet.language}`;
    // The trailing export makes every snippet a module, whatever it imports, so two snippets that
    // declare the same name do not clash. It adds no line before the code, so line numbers hold.
    writeFileSync(path.join(workDirectory, fileName), `${snippet.source}\nexport {};\n`);
    fileNames.push(fileName);
  }

  // Bundler resolution is what a host's Next.js app uses, so `next/headers` needs no `.js`.
  writeFileSync(
    path.join(workDirectory, "tsconfig.json"),
    JSON.stringify({
      compilerOptions: { module: "ESNext", moduleResolution: "Bundler", noEmit: true },
      extends: "../../tsconfig.json",
      // The generated types give `collection: "pages"` its type, as in any host app.
      include: [...fileNames, "../../dev/payload-types.ts"],
    })
  );

  try {
    execFileSync(
      path.join(packageDirectory, "node_modules", ".bin", "tsc"),
      ["-p", path.join(workDirectory, "tsconfig.json"), "--pretty", "false"],
      { encoding: "utf-8", stdio: "pipe" }
    );
    console.log(`README.md: ${snippets.length} code blocks compile`);
  } catch (error) {
    const output = String((error as { stdout?: string }).stdout ?? error);
    const lineByFile = new Map(
      snippets.map((snippet) => [`snippet-line-${snippet.firstLine}.${snippet.language}`, snippet])
    );
    for (const line of output.split("\n")) {
      const match = /^(?<file>[^(]+)\((?<row>\d+),(?<column>\d+)\): (?<message>.*)$/u.exec(line);
      const snippet = match?.groups ? lineByFile.get(path.basename(match.groups.file)) : undefined;
      if (match?.groups && snippet) {
        const readmeLine = snippet.firstLine + Number(match.groups.row) - 1;
        console.error(`README.md:${readmeLine}:${match.groups.column}: ${match.groups.message}`);
      } else if (line.trim() !== "") {
        console.error(line);
      }
    }
    exitCode = 1;
  }
} finally {
  rmSync(workDirectory, { force: true, recursive: true });
}
process.exit(exitCode);
