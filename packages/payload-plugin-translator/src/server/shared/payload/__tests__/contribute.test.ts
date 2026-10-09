import { describe, it, expect, vi } from "vitest";

import { chain, contribute } from "../contribute.js";

type Entry = { id: string; note?: string };

const keyOf = (entry: Entry): string => entry.id;

const answersLater = async (): Promise<Entry[]> => {
  await Promise.resolve();
  return [{ id: "host" }];
};

describe("contribute", () => {
  it("starts the list when the host has none", () => {
    expect(contribute(undefined, [{ id: "a" }], keyOf)).toEqual([{ id: "a" }]);
  });

  it("lands after what the host already had", () => {
    const result = contribute([{ id: "host" }], [{ id: "ours" }], keyOf);

    expect(result.map(keyOf)).toEqual(["host", "ours"]);
  });

  it("drops an entry whose key the host already used", () => {
    const result = contribute([{ id: "a" }], [{ id: "a" }, { id: "b" }], keyOf);

    expect(result.map(keyOf)).toEqual(["a", "b"]);
  });

  it("keeps the first entry rather than replacing it with the duplicate", () => {
    const first = { id: "a", note: "the host's" };

    const result = contribute([first], [{ id: "a", note: "ours" }], keyOf);

    expect(result[0], "a later duplicate must not overwrite what was there").toBe(first);
  });

  it("drops a duplicate among the entries it is given", () => {
    const result = contribute(undefined, [{ id: "a" }, { id: "a" }], keyOf);

    expect(result.map(keyOf)).toEqual(["a"]);
  });

  it("leaves the host's list untouched", () => {
    const hosts = [{ id: "host" }];

    contribute(hosts, [{ id: "ours" }], keyOf);

    expect(hosts.map(keyOf), "the host's array is theirs, not ours to grow").toEqual(["host"]);
  });

  describe("when the host put a function there", () => {
    it("answers with a function, not a list", () => {
      const result = contribute(() => [{ id: "host" }], [{ id: "ours" }], keyOf);

      expect(typeof result).toBe("function");
    });

    it("calls the host's function and appends after it", async () => {
      const result = contribute(() => [{ id: "host" }], [{ id: "ours" }], keyOf);

      expect(typeof result === "function" ? (await result()).map(keyOf) : []).toEqual([
        "host",
        "ours",
      ]);
    });

    it("awaits a host function that answers later", async () => {
      const result = contribute(answersLater, [{ id: "ours" }], keyOf);

      expect(typeof result === "function" ? (await result()).map(keyOf) : []).toEqual([
        "host",
        "ours",
      ]);
    });

    it("passes the caller's arguments through to the host's function", async () => {
      const host = vi.fn((flag: string) => [{ id: flag }]);

      const result = contribute<Entry, [string]>(host, [{ id: "ours" }], keyOf);
      if (typeof result === "function") await result("given");

      expect(host).toHaveBeenCalledWith("given");
    });

    it("checks for a duplicate at call time, not at config time", async () => {
      // The host's answer changes between calls, which is exactly what a config-time check
      // cannot see: the first call has no `ours`, the second produces one itself.
      const answers = [[{ id: "host" }], [{ id: "host" }, { id: "ours" }]];
      const host = () => answers.shift() ?? [];

      const result = contribute(host, [{ id: "ours" }], keyOf);
      if (typeof result !== "function") throw new Error("expected a function");

      expect((await result()).map(keyOf)).toEqual(["host", "ours"]);
      expect((await result()).map(keyOf), "the second call must not say `ours` twice").toEqual([
        "host",
        "ours",
      ]);
    });
  });
});

describe("chain", () => {
  it("runs the host's handler before this plugin's", async () => {
    const order: string[] = [];

    await chain(
      () => {
        order.push("host");
      },
      () => {
        order.push("ours");
      }
    )();

    expect(order).toEqual(["host", "ours"]);
  });

  it("waits for a host handler that finishes later", async () => {
    const order: string[] = [];
    const host = async () => {
      await Promise.resolve();
      order.push("host");
    };

    await chain(host, () => {
      order.push("ours");
    })();

    expect(order, "ours must not start before theirs has finished").toEqual(["host", "ours"]);
  });

  it("runs this plugin's handler when the host registered none", async () => {
    const ours = vi.fn();

    await chain(undefined, ours)();

    expect(ours).toHaveBeenCalledOnce();
  });

  it("passes the caller's arguments to both", async () => {
    const host = vi.fn();
    const ours = vi.fn();

    await chain<[string, number]>(host, ours)("given", 7);

    expect(host).toHaveBeenCalledWith("given", 7);
    expect(ours).toHaveBeenCalledWith("given", 7);
  });
});
