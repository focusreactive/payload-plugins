// @vitest-environment jsdom
import { act, createElement } from "react";
import { createRoot } from "react-dom/client";
import type { Root } from "react-dom/client";
import { afterEach, describe, expect, it } from "vitest";

import { useAsyncRead } from "../../src/admin/useAsyncRead.js";

type Pending = { release: () => void };

const roots: Root[] = [];

afterEach(async () => {
  for (const root of roots.splice(0)) {
    await act(async () => {
      root.unmount();
    });
  }
});

/** Renders a probe whose read waits on a gate the test opens, and records the answers it applied. */
const renderProbe = () => {
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  const root = createRoot(document.createElement("div"));
  roots.push(root);
  const applied: string[] = [];
  const pending: Pending[] = [];
  const Probe = ({ value }: { value: string }) => {
    useAsyncRead(
      async (isCurrent) => {
        await new Promise<void>((resolve) => {
          pending.push({ release: resolve });
        });
        if (isCurrent()) {
          applied.push(value);
        }
      },
      [value]
    );

    return null;
  };
  const render = async (value: string) => {
    await act(async () => {
      root.render(createElement(Probe, { value }));
    });
  };
  const release = async (index: number) => {
    await act(async () => {
      pending[index]?.release();
    });
  };

  return { applied, pending, release, render, unmount: () => act(async () => root.unmount()) };
};

describe("useAsyncRead", () => {
  it("applies the answer of a read that is still current", async () => {
    const probe = renderProbe();
    await probe.render("a");
    await probe.release(0);

    expect(probe.applied).toEqual(["a"]);
  });

  it("drops the answer of an earlier read once the dependencies changed", async () => {
    const probe = renderProbe();
    await probe.render("a");
    await probe.render("b");
    await probe.release(1);
    await probe.release(0);

    expect(probe.applied).toEqual(["b"]);
  });

  it("does not read again while the dependencies stay the same", async () => {
    const probe = renderProbe();
    await probe.render("a");
    await probe.render("a");

    expect(probe.pending).toHaveLength(1);
  });

  it("drops the answer of a read that finishes after the component left", async () => {
    const probe = renderProbe();
    await probe.render("a");
    roots.pop();
    await probe.unmount();
    await probe.release(0);

    expect(probe.applied).toEqual([]);
  });
});
