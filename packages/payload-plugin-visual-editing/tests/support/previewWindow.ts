export const ADMIN_ORIGIN = "https://admin.example.com";

const originalParent = window.parent;
const originalOpener = window.opener;

const replaceWindow = (name: "opener" | "parent", value: unknown) =>
  Object.defineProperty(window, name, { configurable: true, value });

export const stubAdminWindow = (admin: unknown) => replaceWindow("parent", admin);

export const stubOpenerWindow = (opener: unknown) => replaceWindow("opener", opener);

export const restorePreviewWindow = () => {
  replaceWindow("parent", originalParent);
  replaceWindow("opener", originalOpener);
};

export type AdminMessageOptions = { origin?: string; source?: unknown };

export const postFromAdmin = (
  data: unknown,
  { origin = ADMIN_ORIGIN, source = window.parent }: AdminMessageOptions = {}
) => {
  const message = new MessageEvent("message", { data, origin });
  Object.defineProperty(message, "source", { value: source });
  window.dispatchEvent(message);
};

export const postAllFromAdmin = (messages: readonly unknown[]) => {
  for (const message of messages) postFromAdmin(message);
};
