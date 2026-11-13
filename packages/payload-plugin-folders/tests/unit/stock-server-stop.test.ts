import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";

import { isStockServerCommand, stopStockServerFromPidFile } from "../e2e/helpers/stockServer.js";
import type { StopDependencies } from "../e2e/helpers/stockServer.js";

const directories: string[] = [];

const pidFileWith = (processId: number): string => {
  const directory = mkdtempSync(path.join(tmpdir(), "folders-stop-"));
  directories.push(directory);
  const file = path.join(directory, "stock.pid");
  writeFileSync(file, String(processId));

  return file;
};

const stockCommand = "node /repo/node_modules/.bin/next dev dev --port 4079";

type MachineOptions = {
  /** The command line of the saved PID, `null` when it is gone. */
  command: string | null;
  /** How many signals the server survives: 0 dies on SIGTERM, 1 only on SIGKILL, 2 never. */
  survives?: 0 | 1 | 2;
};

/** A machine whose clock is the sleeps: every sleep advances it, and nothing really waits. */
const machine = ({ command, survives = 0 }: MachineOptions) => {
  let isAlive = command !== null;
  let signals = 0;
  const kill = vi.fn((_processId: number, _signal: NodeJS.Signals) => {
    signals += 1;
    if (signals > survives) {
      isAlive = false;
    }
  });
  const sleep = vi.fn(async () => {});
  const dependencies: StopDependencies = {
    commandOf: () => (isAlive ? command : null),
    isPortInUse: async () => isAlive,
    kill,
    log: () => {},
    sleep,
  };

  return { dependencies, kill, sleep };
};

afterEach(() => {
  for (const directory of directories.splice(0)) {
    rmSync(directory, { force: true, recursive: true });
  }
});

describe("isStockServerCommand", () => {
  it("accepts the command startStockServer spawns", () => {
    expect(isStockServerCommand(stockCommand)).toBe(true);
  });

  it("refuses another server, another port and the renamed child", () => {
    expect(isStockServerCommand("node /repo/node_modules/.bin/next dev dev --port 4078")).toBe(
      false
    );
    expect(isStockServerCommand("next-server (v16.4.2)")).toBe(false);
    expect(isStockServerCommand("/usr/bin/vim notes.md")).toBe(false);
  });
});

describe("stopStockServerFromPidFile", () => {
  it("signals the saved group and returns once the server and its port are gone", async () => {
    const { dependencies, kill } = machine({ command: stockCommand });

    const result = await stopStockServerFromPidFile(pidFileWith(4100), dependencies);

    expect(result).toBe("stopped");
    expect(kill).toHaveBeenCalledTimes(1);
    expect(kill).toHaveBeenCalledWith(-4100, "SIGTERM");
  });

  it("sends SIGKILL to the group when the server is still up after the grace period", async () => {
    const { dependencies, kill } = machine({ command: stockCommand, survives: 1 });

    const result = await stopStockServerFromPidFile(pidFileWith(4100), dependencies);

    expect(result).toBe("killed");
    expect(kill.mock.calls).toEqual([
      [-4100, "SIGTERM"],
      [-4100, "SIGKILL"],
    ]);
  });

  it("reports a server that survives SIGKILL instead of waiting for ever", async () => {
    const { dependencies } = machine({ command: stockCommand, survives: 2 });

    expect(await stopStockServerFromPidFile(pidFileWith(4100), dependencies)).toBe("stuck");
  });

  it("does not signal a reused PID that now runs something else", async () => {
    const { dependencies, kill } = machine({ command: "/usr/bin/vim notes.md" });

    expect(await stopStockServerFromPidFile(pidFileWith(4100), dependencies)).toBe("not-ours");
    expect(kill).not.toHaveBeenCalled();
  });

  it("does not signal a server on another port", async () => {
    const { dependencies, kill } = machine({
      command: "node /repo/node_modules/.bin/next dev dev --port 4078",
    });

    expect(await stopStockServerFromPidFile(pidFileWith(4100), dependencies)).toBe("not-ours");
    expect(kill).not.toHaveBeenCalled();
  });

  it("does nothing when the saved process is gone", async () => {
    const { dependencies, kill } = machine({ command: null });

    expect(await stopStockServerFromPidFile(pidFileWith(4100), dependencies)).toBe("none");
    expect(kill).not.toHaveBeenCalled();
  });

  it("does nothing when there is no PID file", async () => {
    const { dependencies, kill } = machine({ command: stockCommand });

    expect(await stopStockServerFromPidFile("/nonexistent/stock.pid", dependencies)).toBe("none");
    expect(kill).not.toHaveBeenCalled();
  });
});
