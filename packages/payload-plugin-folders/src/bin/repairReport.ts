import type { RepairResult } from "../core/repair.js";
import type { IssueList } from "../core/treeIssues.js";

export type RepairArguments = {
  dryRun: boolean;
  /** `undefined` leaves the choice to the plugin's `redirects.enabled`. */
  redirects: boolean | undefined;
};

/**
 * The flags after the script path. `payload run` keeps `--help` and `--json` for itself, so the
 * script has neither. A leading `--` (the separator before the flags) is ignored.
 */
export const parseRepairArguments = (argv: string[]): RepairArguments => {
  const parsed: RepairArguments = { dryRun: false, redirects: undefined };
  for (const argument of argv) {
    if (argument === "--") {
      continue;
    }
    if (argument === "--dry-run") {
      parsed.dryRun = true;
    } else if (argument === "--no-redirects") {
      parsed.redirects = false;
    } else {
      throw new Error(
        `Unknown option "${argument}". Options: --dry-run (list what would change and write nothing), --no-redirects (write no redirect rows for the URLs that change).`
      );
    }
  }

  return parsed;
};

/** Issues of a list printed per kind, so one flood of a kind does not hide the others. */
const printedPerKind = 5;

const describeList = (heading: string, list: IssueList): string[] => {
  if (list.total === 0) {
    return [`${heading}: none`];
  }
  const lines = [`${heading}: ${list.total}`];
  const printed = new Map<string, number>();
  for (const issue of list.issues) {
    const count = (printed.get(issue.kind) ?? 0) + 1;
    printed.set(issue.kind, count);
    if (count <= printedPerKind) {
      lines.push(`  - ${issue.message}`);
    }
  }
  for (const [kind, total] of Object.entries(list.counts)) {
    const shown = Math.min(printed.get(kind) ?? 0, printedPerKind);
    if (total > shown) {
      lines.push(`  - ${total - shown} more of kind ${kind}`);
    }
  }

  return lines;
};

export const formatRepairReport = (result: RepairResult): string => {
  const { writes } = result;

  return [
    result.dryRun ? "Folder tree repair (dry run, nothing written)" : "Folder tree repair",
    ...describeList(result.dryRun ? "To fix" : "Fixed", result.fixed),
    ...describeList("Conflicts left for you", result.conflicts),
    `URL changes: ${result.changes.total}`,
    `${result.dryRun ? "Rows to write" : "Rows written"}: folders ${writes.folders}, pages ${writes.pages}, order keys ${writes.orderKeys}, latest versions ${writes.versions}, redirect rows ${writes.redirectsWritten}, redirect rows deleted ${writes.redirectsDeleted}`,
  ].join("\n");
};
