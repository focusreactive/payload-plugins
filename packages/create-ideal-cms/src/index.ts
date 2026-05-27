import { log, outro, spinner } from "@clack/prompts";
import { spawn } from "node:child_process";
import { join } from "node:path";
import { parseArgs } from "node:util";
import pc from "picocolors";
import { collectAnswers } from "./prompts.js";
import type { Answers, PackageManager } from "./prompts.js";
import { fetchTemplate } from "./scaffold.js";
import { applyTransforms } from "./transforms.js";

function parseCliArgs(): { name?: string; ref?: string; fromLocal?: string } {
  const { values, positionals } = parseArgs({
    args: process.argv.slice(2),
    options: {
      ref: { type: "string" },
      "from-local": { type: "string" },
      help: { type: "boolean", short: "h" },
    },
    allowPositionals: true,
    strict: false,
  });

  if (values.help) {
    process.stdout.write(`
${pc.bold("create-ideal-cms")} — scaffold a Payload CMS monorepo

${pc.bold("Usage:")}
  npx @focus-reactive/create-ideal-cms [name] [--ref <git-ref>] [--from-local <path>]

${pc.bold("Options:")}
  --ref           GitHub ref of focusreactive/payload-plugins to template from (default: main)
  --from-local    Use a local checkout of the source monorepo instead of fetching from GitHub
  -h, --help

`);
    process.exit(0);
  }

  return {
    name: typeof positionals[0] === "string" ? positionals[0] : undefined,
    ref: typeof values.ref === "string" ? values.ref : undefined,
    fromLocal: typeof values["from-local"] === "string" ? values["from-local"] : undefined,
  };
}

function runCommand(cmd: string, args: string[], cwd: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { cwd, stdio: "inherit", shell: false });
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`${cmd} ${args.join(" ")} exited with code ${code}`));
      }
    });
  });
}

function pmRunArgs(pm: PackageManager, script: string, args: string[] = []): string[] {
  if (pm === "skip") throw new Error("pmRunArgs called with skip");
  if (pm === "npm" && args.length > 0) return ["run", script, "--", ...args];
  return ["run", script, ...args];
}

async function installDeps(targetDir: string, pm: PackageManager): Promise<void> {
  if (pm === "skip") return;
  await runCommand(pm, ["install"], targetDir);
}

async function runInitialMigration(targetDir: string, pm: PackageManager): Promise<void> {
  if (pm === "skip") {
    log.warn("Skipped initial migration because dependency install was skipped.");
    return;
  }
  const cmsDir = join(targetDir, "apps/cms");
  await runCommand(pm, pmRunArgs(pm, "payload", ["migrate:create", "init"]), cmsDir);
  await runCommand(pm, pmRunArgs(pm, "payload", ["migrate"]), cmsDir);
}

async function initGit(targetDir: string): Promise<void> {
  try {
    await runCommand("git", ["init", "-q", "-b", "main"], targetDir);
    await runCommand("git", ["add", "."], targetDir);
    await runCommand("git", ["commit", "-q", "--no-gpg-sign", "-m", "chore: bootstrap with create-ideal-cms"], targetDir);
  } catch (err) {
    log.warn(`git init skipped: ${(err as Error).message}`);
  }
}

function printNextSteps(answers: Answers, migrationRan: boolean): void {
  const pm = answers.packageManager;
  const run = pm === "skip" ? "bun" : pm;
  const lines = [pc.green(`✓ Created ${pc.bold(answers.projectName)}`), pc.dim(`  at ${answers.targetDir}`), "", pc.bold("Next steps:"), `  cd ${answers.targetDir}`];
  if (pm === "skip") lines.push(`  ${run} install`);
  if (!migrationRan) {
    lines.push(`  ${run} --cwd apps/cms run payload migrate:create init`);
    lines.push(`  ${run} --cwd apps/cms run payload migrate`);
  }
  lines.push(`  ${run} run dev                 ${pc.dim("# starts on port 3333")}`);
  lines.push("");
  lines.push(pc.dim("Edit apps/cms/.env to add OpenAI / OIDC / Blob tokens later."));
  outro(lines.join("\n"));
}

function describeSource(answers: Answers): string {
  return answers.source.kind === "local" ? `local checkout at ${answers.source.path}` : `focusreactive/payload-plugins#${answers.source.ref}`;
}

async function main(): Promise<void> {
  const argv = parseCliArgs();
  const answers = await collectAnswers(argv);

  const s = spinner();
  s.start(`Fetching template from ${describeSource(answers)}`);
  try {
    await fetchTemplate(answers.targetDir, answers.source);
    s.stop("Template fetched");
  } catch (err) {
    s.stop("Template fetch failed");
    log.error((err as Error).message);
    process.exit(1);
  }

  s.start("Applying configuration");
  try {
    await applyTransforms(answers);
    s.stop("Configuration applied");
  } catch (err) {
    s.stop("Configuration failed");
    log.error((err as Error).message);
    process.exit(1);
  }

  if (answers.initGit) {
    s.start("Initializing git");
    await initGit(answers.targetDir);
    s.stop("Git initialized");
  }

  if (answers.packageManager !== "skip") {
    log.step(`Installing dependencies with ${answers.packageManager}…`);
    try {
      await installDeps(answers.targetDir, answers.packageManager);
    } catch (err) {
      log.error(`Install failed: ${(err as Error).message}`);
      log.message(`You can finish setup manually with: ${answers.packageManager} install`);
      printNextSteps(answers, false);
      return;
    }
  }

  let migrationRan = false;
  if (answers.runInitialMigration && answers.packageManager !== "skip") {
    log.step("Generating and applying the initial database migration…");
    try {
      await runInitialMigration(answers.targetDir, answers.packageManager);
      migrationRan = true;
    } catch (err) {
      log.warn(`Initial migration failed: ${(err as Error).message}\nFix DATABASE_URL in apps/cms/.env and re-run \`payload migrate:create init && payload migrate\` from apps/cms/.`);
    }
  }

  printNextSteps(answers, migrationRan);
}

// oxlint-disable-next-line promise/prefer-await-to-then
main().catch((err) => {
  log.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
});
