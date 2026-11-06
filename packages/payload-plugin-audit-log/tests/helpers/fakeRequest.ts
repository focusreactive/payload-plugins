import { vi } from "vitest";
import type { Mock } from "vitest";

type RecordedEvent = Record<string, any>;

export function fakeRequest(overrides: Record<string, unknown> = {}) {
  const create = vi.fn().mockResolvedValue({});
  const error = vi.fn();
  const db: Record<string, unknown> = { create };
  const req = {
    context: {} as Record<string, unknown>,
    user: { id: 1, collection: "users", email: "e@x.io" } as unknown,
    payloadAPI: "local",
    headers: new Headers(),
    query: {},
    payload: { db, logger: { error } },
    ...overrides,
  };
  return { req, db, create, error };
}

export async function runHooks(hooks: readonly unknown[] | undefined, args: unknown) {
  for (const hook of hooks ?? []) await (hook as (args: unknown) => unknown)(args);
}

export const recordedEvents = (create: Mock): RecordedEvent[] =>
  create.mock.calls.map(([args]) => (args as { data: RecordedEvent }).data);

export const recordedActions = (create: Mock): string[] =>
  recordedEvents(create).map((event) => event.action as string);

export async function runBeforeOperation<R extends object>(
  hooks: readonly unknown[] | undefined,
  hookArgs: Record<string, unknown> & { args: object; req: R }
): Promise<R> {
  let args: object = hookArgs.args;
  for (const hook of hooks ?? []) {
    const returned = await (hook as (args: unknown) => unknown)({ ...hookArgs, args });
    if (returned !== undefined) args = returned as object;
  }
  return (args as { req?: R }).req ?? hookArgs.req;
}
