import { describe, expect, it } from "vitest";

import type { Payload } from "payload";

import { AsyncMutex, installTreeLockTracking, isTreeLockHeld } from "../../src/core/treeLock.js";

const tick = () =>
  new Promise((resolve) => {
    setTimeout(resolve, 5);
  });

/** A stand-in for a database adapter that records the order of its transaction calls. */
const createFakeAdapter = (name: string) => {
  const events: string[] = [];
  let counter = 0;

  return {
    beginTransaction: async () => {
      counter += 1;
      events.push(`begin tx${counter}`);

      return `tx${counter}`;
    },
    commitTransaction: async (id: unknown) => {
      events.push(`commit ${String(id)}`);
    },
    events,
    name,
    rollbackTransaction: async (id: unknown) => {
      events.push(`rollback ${String(id)}`);
    },
  };
};

describe("AsyncMutex", () => {
  it("hands the lock to waiters in the order they asked", async () => {
    const mutex = new AsyncMutex();
    const order: number[] = [];
    const releaseFirst = await mutex.acquire(1000);

    const waiters = [1, 2, 3].map(async (id) => {
      const release = await mutex.acquire(1000);
      order.push(id);
      release();
    });
    expect(mutex.locked).toBe(true);
    releaseFirst();
    await Promise.all(waiters);

    expect(order).toEqual([1, 2, 3]);
    expect(mutex.locked).toBe(false);
  });

  it("never reads as free while the lock passes to the next waiter", async () => {
    const mutex = new AsyncMutex();
    const releaseFirst = await mutex.acquire(1000);
    const second = mutex.acquire(1000);

    releaseFirst();

    expect(mutex.locked).toBe(true);
    (await second)();
    expect(mutex.locked).toBe(false);
  });

  it("a waiter that times out leaves the queue and does not block the next one", async () => {
    const mutex = new AsyncMutex();
    const releaseFirst = await mutex.acquire(1000);
    const timedOut = mutex.acquire(10);
    const patient = mutex.acquire(1000);

    await expect(timedOut).rejects.toThrow(/Timed out after 10 ms/u);
    releaseFirst();
    const release = await patient;

    expect(mutex.locked).toBe(true);
    release();
    expect(mutex.locked).toBe(false);
  });

  it("releasing twice does not hand the lock to two holders", async () => {
    const mutex = new AsyncMutex();
    const releaseFirst = await mutex.acquire(1000);
    const second = mutex.acquire(1000);
    const third = mutex.acquire(1000);

    releaseFirst();
    releaseFirst();
    const releaseSecond = await second;
    let thirdHasLock = false;
    void third.then(() => {
      thirdHasLock = true;
    });
    await new Promise((resolve) => {
      setTimeout(resolve, 10);
    });

    expect(thirdHasLock).toBe(false);
    releaseSecond();
    (await third)();
  });
});

describe("installTreeLockTracking", () => {
  it("on SQLite a second transaction does not begin until the first commits", async () => {
    const payload = {} as Payload;
    const adapter = createFakeAdapter("sqlite");
    installTreeLockTracking(payload, adapter);

    const first = await adapter.beginTransaction();
    const second = adapter.beginTransaction();
    await tick();
    expect(adapter.events).toEqual(["begin tx1"]);
    expect(isTreeLockHeld(payload)).toBe(true);

    await adapter.commitTransaction(first);
    expect(await second).toBe("tx2");
    expect(adapter.events).toEqual(["begin tx1", "commit tx1", "begin tx2"]);

    await adapter.rollbackTransaction("tx2");
    expect(isTreeLockHeld(payload)).toBe(false);
  });

  it("on SQLite a rollback frees the next waiter just like a commit", async () => {
    const payload = {} as Payload;
    const adapter = createFakeAdapter("sqlite");
    installTreeLockTracking(payload, adapter);

    const first = await adapter.beginTransaction();
    const second = adapter.beginTransaction();
    await adapter.rollbackTransaction(first);

    expect(await second).toBe("tx2");
  });

  it("other adapters begin transactions without queueing", async () => {
    const payload = {} as Payload;
    const adapter = createFakeAdapter("postgres");
    installTreeLockTracking(payload, adapter);

    await adapter.beginTransaction();
    await adapter.beginTransaction();

    expect(adapter.events).toEqual(["begin tx1", "begin tx2"]);
    expect(isTreeLockHeld(payload)).toBe(false);
  });

  it("an adapter without transactions never holds the lock", async () => {
    const payload = {} as Payload;
    const adapter = {
      ...createFakeAdapter("sqlite"),
      beginTransaction: async () => null,
    };
    installTreeLockTracking(payload, adapter);

    await adapter.beginTransaction();
    await adapter.beginTransaction();

    expect(isTreeLockHeld(payload)).toBe(false);
  });

  it("tracks each Payload instance on its own", async () => {
    const firstPayload = {} as Payload;
    const secondPayload = {} as Payload;
    const firstAdapter = createFakeAdapter("sqlite");
    const secondAdapter = createFakeAdapter("sqlite");
    installTreeLockTracking(firstPayload, firstAdapter);
    installTreeLockTracking(secondPayload, secondAdapter);

    await firstAdapter.beginTransaction();
    await secondAdapter.beginTransaction();

    expect(secondAdapter.events).toEqual(["begin tx1"]);
  });
});
