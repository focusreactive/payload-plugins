// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { FieldTranslationResult } from "../../../../../types/wire/field-translation.js";
import type { Abilities } from "../../../../../types/wire/TranslateKitConfig.js";
import { InMemoryTranslationRepository } from "../../../../entities/translation/__tests__/InMemoryTranslationRepository.fixture.js";
import { TranslationRepositoryProvider } from "../../../../entities/translation/index.js";
import { ApiRequestError } from "../../../../shared/api/errors/ApiRequestError.js";
import { TranslateKitConfigProvider } from "../../../../shared/config/index.js";

const host = vi.hoisted(() => ({
  id: "1" as string | undefined,
  value: "Festival de verano" as unknown,
  dispatch: vi.fn<(action: { type: string; value: unknown }) => void>(),
  setModified: vi.fn(),
  setProcessing: vi.fn(),
  toast: vi.fn(),
}));

// `@payloadcms/ui` ships CSS imports Vitest cannot load; the control reads only these hooks.
vi.mock("@payloadcms/ui", () => ({
  useField: () => ({ value: host.value, path: "title" }),
  useLocale: () => ({ code: "es" }),
  useDocumentInfo: () => ({ collectionSlug: "pages", id: host.id }),
  useConfig: () => ({
    config: {
      localization: {
        defaultLocale: "en",
        locales: [
          { code: "en", label: "English" },
          { code: "de", label: "Deutsch" },
          { code: "es", label: "Español" },
        ],
      },
    },
  }),
  useForm: () => ({ setModified: host.setModified, setProcessing: host.setProcessing }),
  useFormFields: (select: (context: [unknown, typeof host.dispatch]) => unknown) =>
    select([{}, host.dispatch]),
  toast: { success: host.toast, error: host.toast, info: host.toast, warning: host.toast },
}));

const TranslateFieldControl = (await import("../TranslateFieldControl.js")).default;

const EVERY_ABILITY: Abilities = {
  translate: true,
  cancel: true,
  runNow: true,
  staleness: true,
  translateField: true,
};

function show({ abilities = EVERY_ABILITY }: { abilities?: Abilities } = {}) {
  const repository = new InMemoryTranslationRepository([{ collection: "pages", id: "1" }], {
    source: "en",
    targets: ["de", "es"],
  });
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const view = render(
    <TranslateKitConfigProvider config={{ basePath: "/translate", abilities, collections: {} }}>
      <TranslationRepositoryProvider repository={repository}>
        <QueryClientProvider client={client}>
          <TranslateFieldControl />
        </QueryClientProvider>
      </TranslationRepositoryProvider>
    </TranslateKitConfigProvider>
  );
  return { repository, container: view.container };
}

const answering = (repository: InMemoryTranslationRepository, answer: FieldTranslationResult) =>
  vi.spyOn(repository, "translateField").mockResolvedValue(answer);

const writes = () => host.dispatch.mock.calls.map(([action]) => action.value);

afterEach(() => {
  cleanup();
  host.id = "1";
  host.value = "Festival de verano";
  vi.clearAllMocks();
});

describe("the field control", () => {
  it("writes the translation into the form, then offers Undo and Again", async () => {
    const { repository } = show();
    const translate = answering(repository, { status: "translated", value: "[es] Summer" });

    fireEvent.click(screen.getByRole("button", { name: "Translate" }));

    await screen.findByRole("button", { name: "Undo" });
    expect(translate).toHaveBeenCalledWith({
      collection_slug: "pages",
      field_path: "title",
      target_lng: "es",
      source_lng: "en",
      doc_id: "1",
    });
    expect(host.dispatch).toHaveBeenCalledWith({
      type: "UPDATE",
      path: "title",
      value: "[es] Summer",
      initialValue: "[es] Summer",
    });
    expect(host.setModified).toHaveBeenCalledWith(true);
    expect(host.setProcessing.mock.calls).toEqual([[true], [false]]);
    expect(host.toast).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "Again" }));
    await waitFor(() => expect(translate).toHaveBeenCalledTimes(2));
    expect(translate.mock.calls[1]?.[0].source_lng).toBe("en");

    fireEvent.click(await screen.findByRole("button", { name: "Undo" }));
    expect(writes().at(-1)).toBe("Festival de verano");
    expect(screen.getByRole("button", { name: "Translate" })).toBeTruthy();
  });

  it("shows Translating while the provider is asked", async () => {
    const { repository } = show();
    vi.spyOn(repository, "translateField").mockReturnValue(new Promise(() => undefined));

    fireEvent.click(screen.getByRole("button", { name: "Translate" }));

    expect((await screen.findByRole("status")).textContent).toContain("Translating");
    expect(host.setProcessing).toHaveBeenCalledWith(true);
  });

  it("says it could not translate, inline, and tries again", async () => {
    const { repository } = show();
    const translate = vi
      .spyOn(repository, "translateField")
      .mockRejectedValue(new ApiRequestError("timeout", "The provider did not answer"));

    fireEvent.click(screen.getByRole("button", { name: "Translate" }));

    const alert = await screen.findByRole("alert");
    expect(alert.textContent).toContain("Couldn’t translate");
    expect(host.dispatch).not.toHaveBeenCalled();
    expect(host.toast).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    await waitFor(() => expect(translate).toHaveBeenCalledTimes(2));
  });

  it("shows a noop answer's notice inline, not as a toast", async () => {
    show();

    fireEvent.click(screen.getByRole("button", { name: "Translate" }));

    expect((await screen.findByRole("status")).textContent).toBe("The fake does not translate.");
    expect(host.toast).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Translate" })).toBeTruthy();
  });

  it("is shown disabled with the save hint on an unsaved document", () => {
    host.id = undefined;
    show();

    expect((screen.getByRole("button", { name: "Translate" }) as HTMLButtonElement).disabled).toBe(
      true
    );
    expect(
      screen.getByRole("button", { name: "Save the document to pull from another locale." })
    ).toBeTruthy();
  });

  it("is disabled with the block hint once the server says the field sits in a localized list", async () => {
    const { repository } = show();
    answering(repository, {
      status: "noop",
      notice: { level: "info", reason: "localized-list", message: "Localized list" },
    });

    fireEvent.click(screen.getByRole("button", { name: "Translate" }));

    await screen.findByRole("button", { name: /Every locale has its own blocks here/u });
    expect((screen.getByRole("button", { name: "Translate" }) as HTMLButtonElement).disabled).toBe(
      true
    );
  });

  it("translates from the locale picked in the source menu", async () => {
    const { repository } = show();
    const translate = answering(repository, { status: "translated", value: "[es] Sommer" });

    fireEvent.click(screen.getByRole("button", { name: "Choose another source locale" }));
    expect(
      (await screen.findByRole("button", { name: "Translate from English" })).textContent
    ).toContain("the panel’s");
    fireEvent.click(screen.getByRole("button", { name: "Translate from Deutsch" }));

    await waitFor(() =>
      expect(translate).toHaveBeenCalledWith(expect.objectContaining({ source_lng: "de" }))
    );
  });

  it("renders nothing without the ability", () => {
    const { container } = show({ abilities: { ...EVERY_ABILITY, translateField: false } });

    expect(container.innerHTML).toBe("");
  });
});
