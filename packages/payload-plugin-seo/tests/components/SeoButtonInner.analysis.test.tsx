// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { act, cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SeoButtonInner } from "../../src/components/SeoButton/SeoButtonInner";

interface FormState {
  formFields: Record<string, { value: unknown }>;
  drawerOpen: boolean;
  lastUpdateTime: number;
  rerender: () => void;
}

const form: FormState = {
  formFields: {},
  drawerOpen: false,
  lastUpdateTime: 0,
  rerender: () => undefined,
};

const openModal = vi.fn();

vi.mock("@payloadcms/ui", async () => {
  const { useReducer } = await import("react");

  return {
    Button: (p: { "aria-label"?: string; onClick?: () => void; children?: unknown }) => (
      <button aria-label={p["aria-label"]} onClick={p.onClick} type="button" />
    ),
    useAllFormFields: () => {
      const [, force] = useReducer((n: number) => n + 1, 0);
      form.rerender = force;
      return [form.formFields];
    },
    useConfig: () => ({ config: { routes: { api: "/api", admin: "/admin" } } }),
    useDebounce: <T,>(value: T) => value,
    useDocumentInfo: () => ({ id: "1", lastUpdateTime: form.lastUpdateTime }),
    useForm: () => ({ getData: () => ({}) }),
    useLocale: () => ({ code: "en" }),
    useModal: () => ({
      openModal: (slug: string) => {
        openModal(slug);
        form.drawerOpen = true;
        form.rerender();
      },
      isModalOpen: () => form.drawerOpen,
    }),
  };
});

vi.mock("../../src/components/SeoDrawer", () => ({ SeoDrawer: () => null }));

vi.mock("../../src/components/SeoDrawer/languagePacks", () => ({
  ensureLanguagePack: () => Promise.resolve(),
}));

vi.mock("../../src/components/SeoDrawer/build-analysis-input", () => ({
  buildAnalysisInput: (args: { values: Record<string, unknown> }) =>
    Promise.resolve({ title: String(args.values.title ?? "") }),
}));

const runAnalysis = vi.fn((input: { title: string }) => ({
  overall: { seoScore: input.title.length, status: "warn" },
}));

vi.mock("../../src/engine/runAnalysis", () => ({
  runAnalysis: (input: { title: string }) => runAnalysis(input),
}));

const props = {
  collectionSlug: "pages",
  fields: {},
  extractContentPath: "@/x#default",
  site: { name: "Site", baseUrl: "https://example.com", faviconUrl: "" },
  supportedLocales: ["en"],
};

function typeTitle(title: string) {
  act(() => {
    form.formFields = { title: { value: title } };
    form.rerender();
  });
}

function badgeScore() {
  return screen.queryByLabelText(/score/iu)?.textContent ?? null;
}

beforeEach(() => {
  form.formFields = { title: { value: "abc" } };
  form.drawerOpen = false;
  form.lastUpdateTime = 1;
});

afterEach(() => {
  cleanup();
  runAnalysis.mockClear();
  openModal.mockClear();
});

describe("SeoButtonInner analysis with the drawer closed", () => {
  it("scores the badge once on load", async () => {
    render(<SeoButtonInner {...props} />);

    await waitFor(() => expect(badgeScore()).toBe("3"));
    expect(runAnalysis).toHaveBeenCalledTimes(1);
  });

  it("does not analyse while the user types", async () => {
    render(<SeoButtonInner {...props} />);
    await waitFor(() => expect(runAnalysis).toHaveBeenCalledTimes(1));

    typeTitle("abcdef");
    typeTitle("abcdefgh");

    await act(async () => {
      await Promise.resolve();
    });
    expect(runAnalysis).toHaveBeenCalledTimes(1);
    expect(badgeScore()).toBe("3");
  });

  it("rescores the badge after the document is saved", async () => {
    const { rerender } = render(<SeoButtonInner {...props} />);
    await waitFor(() => expect(badgeScore()).toBe("3"));

    typeTitle("abcdef");
    form.lastUpdateTime = 2;
    rerender(<SeoButtonInner {...props} />);

    await waitFor(() => expect(badgeScore()).toBe("6"));
    expect(runAnalysis).toHaveBeenCalledTimes(2);
  });
});

describe("SeoButtonInner analysis with the drawer open", () => {
  it("analyses when the drawer opens and on every change while it is open", async () => {
    render(<SeoButtonInner {...props} />);
    await waitFor(() => expect(runAnalysis).toHaveBeenCalledTimes(1));
    typeTitle("abcd");

    act(() => screen.getByRole("button").click());
    await waitFor(() => expect(badgeScore()).toBe("4"));
    expect(runAnalysis).toHaveBeenCalledTimes(2);

    typeTitle("abcdefg");

    await waitFor(() => expect(badgeScore()).toBe("7"));
    expect(runAnalysis).toHaveBeenCalledTimes(3);
  });
});
