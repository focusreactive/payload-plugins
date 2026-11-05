import { AsyncLocalStorage } from "node:async_hooks";
import type { Payload } from "payload";
import { LOG_PREFIX } from "../constants";

type BufferedWrite = () => Promise<unknown>;

export type CommandWrites = {
  held: BufferedWrite[];
  writeAfterNextCommit: boolean;
};

const COMMAND_WRITE_BUFFER = Symbol.for("payload-plugin-audit-log.commandWriteBuffer");

type GlobalWithCommandWriteBuffer = typeof globalThis & {
  [COMMAND_WRITE_BUFFER]?: AsyncLocalStorage<CommandWrites>;
};

function commandWriteBuffer(): AsyncLocalStorage<CommandWrites> {
  const shared = globalThis as GlobalWithCommandWriteBuffer;
  shared[COMMAND_WRITE_BUFFER] ??= new AsyncLocalStorage<CommandWrites>();
  return shared[COMMAND_WRITE_BUFFER];
}

export const activeCommandWrites = (): CommandWrites | undefined => commandWriteBuffer().getStore();

const messageOf = (err: unknown): string => (err instanceof Error ? err.message : String(err));

export async function writeHeldUntilFirstFailure(command: CommandWrites): Promise<void> {
  while (command.held.length > 0) {
    const [next] = command.held;
    try {
      await next?.();
    } catch {
      return;
    }
    command.held.shift();
  }
}

export async function holdCommittedWrites(
  command: CommandWrites,
  committed: readonly BufferedWrite[]
): Promise<void> {
  command.held.push(...committed);
  if (!command.writeAfterNextCommit) return;
  command.writeAfterNextCommit = false;
  await writeHeldUntilFirstFailure(command);
}

async function writeEveryHeld(payload: Payload, writes: readonly BufferedWrite[]): Promise<void> {
  let failed = 0;
  let firstFailure: unknown;
  for (const write of writes) {
    try {
      await write();
    } catch (err) {
      failed += 1;
      firstFailure ??= err;
    }
  }
  if (failed === 0) return;
  payload.logger.warn(
    `${LOG_PREFIX} ${failed} audit event(s) recorded during the command could not be written: ${messageOf(firstFailure)}`
  );
}

export async function bufferAuditWritesUntilCommandEnds<T>(
  payload: Payload,
  command: () => Promise<T>
): Promise<T> {
  if (activeCommandWrites()) return command();
  const writes: CommandWrites = { held: [], writeAfterNextCommit: false };
  try {
    return await commandWriteBuffer().run(writes, command);
  } finally {
    await writeEveryHeld(payload, writes.held.splice(0));
  }
}
