import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";

import { stopStockServerFromPidFile } from "../e2e/helpers/stockServer.js";
import type { StopDependencies } from "../e2e/helpers/stockServer.js";

const directories: string[] = [];

const pidFileWith = (processId: number): string => {
  const directory = mkdtempSync(path.join(tmpdir(), "folders-stop-"));
  directories.push(directory);
  const file = path.join(directory, "stock.pid");
  writeFileSync(file, String(processId));

  return file;
};

const machine = (listeners: number[], groups: Record<number, number>) => {
  const kill = vi.fn();
  const dependencies: StopDependencies = {
    kill,
    listenerProcessIds: () => listeners,
    processGroupOf: (processId) => groups[processId] ?? null,
  };

  return { dependencies, kill };
};

afterEach(() => {
  for (const directory of directories.splice(0)) {
    rmSync(directory, { force: true, recursive: true });
  }
});

describe("stopStockServerFromPidFile", () => {
  it("signals the saved group when the saved PID leads the group of the port's listener", () => {
    const { dependencies, kill } = machine([4242], { 4242: 4100 });

    const stopped = stopStockServerFromPidFile(pidFileWith(4100), dependencies);

    expect(stopped).toBe(true);
    expect(kill).toHaveBeenCalledWith(-4100, "SIGTERM");
  });

  it("signals the saved group when the saved PID is the listener itself", () => {
    const { dependencies, kill } = machine([4100], { 4100: 4100 });

    stopStockServerFromPidFile(pidFileWith(4100), dependencies);

    expect(kill).toHaveBeenCalledWith(-4100, "SIGTERM");
  });

  it("does not signal a reused PID that does not own the port", () => {
    // The old server is gone, the PID now belongs to another session's process group.
    const { dependencies, kill } = machine([], {});

    expect(stopStockServerFromPidFile(pidFileWith(4100), dependencies)).toBe(false);
    expect(kill).not.toHaveBeenCalled();
  });

  it("does not signal when the port's listener belongs to another group", () => {
    const { dependencies, kill } = machine([9000], { 9000: 8000 });

    expect(stopStockServerFromPidFile(pidFileWith(4100), dependencies)).toBe(false);
    expect(kill).not.toHaveBeenCalled();
  });

  it("does nothing when there is no PID file", () => {
    const { dependencies, kill } = machine([4100], { 4100: 4100 });

    expect(stopStockServerFromPidFile("/nonexistent/stock.pid", dependencies)).toBe(false);
    expect(kill).not.toHaveBeenCalled();
  });
});
