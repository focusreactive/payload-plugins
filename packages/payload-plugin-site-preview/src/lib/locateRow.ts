// Rows are expanded through form state; tabs have no such way in — a tabs field keeps its active tab
// in local state — so they are switched by clicking, and rows are found by the ids Payload 3.88 gives
// them. After a Payload upgrade, click a nested card in the preview first.

const WAIT_MS = 3000;
// A drawer fetches and renders its document after it opens.
const LOAD_MS = 15000;
// How long after a click a tab switched back by its saved preference is clicked again.
const TAB_GUARD_MS = 1500;

const TAB = ".tabs-field__tab-button";
const ACTIVE_TAB = "tabs-field__tab-button--active";

type SchemaField = {
  type: string;
  name?: string;
  fields?: SchemaField[];
  tabs?: { name?: string; fields: SchemaField[] }[];
  blocks?: { slug: string; fields: SchemaField[] }[];
  blockReferences?: (string | { slug: string; fields: SchemaField[] })[];
};
type Blocks = Record<string, { fields: SchemaField[] } | undefined>;

const isIndex = (segment: string) => /^\d+$/u.test(segment);
const domId = (path: string) => `field-${path.replace(/\./gu, "__")}`;
// An array row's header carries `scroll-<useId>-row-3` too; the row itself never starts with it.
const isRow = (el: Element) => /-row-\d+$/u.test(el.id) && !el.id.startsWith("scroll-");

/* --------------------------------------------------------------- the plan */

// The fields that share one level of data: rows, collapsibles and unnamed tabs add no key.
const levelFields = (fields: SchemaField[]): SchemaField[] =>
  fields.flatMap((field) => {
    if (field.type === "row" || field.type === "collapsible")
      return levelFields(field.fields ?? []);
    if (field.type === "tabs")
      return (field.tabs ?? []).flatMap((tab) =>
        tab.name ? [{ type: "group", name: tab.name, fields: tab.fields }] : levelFields(tab.fields)
      );
    return [field];
  });

// Which tab of this level's tabs field holds `name` — a named tab is `name` itself. Null when there
// are no tabs, or it is outside them.
const tabHolding = (fields: SchemaField[], name: string) => {
  const tabs = fields
    .flatMap((field) =>
      field.type === "row" || field.type === "collapsible"
        ? levelFields(field.fields ?? [])
        : [field]
    )
    .find((field) => field.type === "tabs");
  const index =
    tabs?.tabs?.findIndex((tab) =>
      tab.name ? tab.name === name : levelFields(tab.fields).some((field) => field.name === name)
    ) ?? -1;
  return index < 0 ? null : index;
};

/**
 * The tab to open at each level of `path`, read from the schema and the form's data: [0] is the
 * form's own tabs, [n] the tabs inside the n-th row on the way. Only the active tab's fields are
 * rendered, so the DOM cannot say where a field is until its tab is open.
 */
export const planTabs = (
  rootFields: SchemaField[],
  blocks: Blocks,
  data: unknown,
  path: string
): (number | null)[] => {
  const segments = path.split(".");
  const plan: (number | null)[] = [tabHolding(rootFields, segments[0])];
  let fields = rootFields;
  let field: SchemaField | undefined;
  let value = data as Record<string, unknown> | undefined;

  for (let i = 0; i < segments.length; i += 1) {
    const segment = segments[i];
    if (!isIndex(segment)) {
      field = levelFields(fields).find((candidate) => candidate.name === segment);
      value = value?.[segment] as Record<string, unknown> | undefined;
      if (field?.type === "group") fields = field.fields ?? [];
      continue;
    }
    const row = (value as unknown as Record<string, unknown>[] | undefined)?.[Number(segment)];
    if (field?.type === "blocks") {
      const slug = row?.blockType as string | undefined;
      const inline = field.blocks?.find((block) => block.slug === slug);
      const referenced = field.blockReferences?.find(
        (block) => (typeof block === "string" ? block : block.slug) === slug
      );
      fields =
        (inline ?? (typeof referenced === "object" ? referenced : slug ? blocks[slug] : undefined))
          ?.fields ?? [];
    } else {
      fields = field?.fields ?? [];
    }
    value = row;
    plan.push(segments[i + 1] ? tabHolding(fields, segments[i + 1]) : null);
  }
  return plan;
};

/* ------------------------------------------------------------ the DOM walk */

// Looks again on every change to the form's markup — a tab just clicked mounts its fields a render later.
const waitFor = async <T>(lookup: () => T | null, timeout = WAIT_MS): Promise<T | null> => {
  const found = lookup();
  if (found) {
    return found;
  }
  let observer: MutationObserver | undefined;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const appeared = new Promise<T>((resolve) => {
    observer = new MutationObserver(() => {
      const match = lookup();
      if (match) {
        resolve(match);
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });
  });
  const expired = new Promise<null>((resolve) => {
    timer = setTimeout(() => resolve(null), timeout);
  });
  const result = await Promise.race([appeared, expired]);
  observer?.disconnect();
  clearTimeout(timer);
  return result;
};

// The tab buttons of `row` itself — or of the form in `root`, for null — not of the rows nested in it.
const tabsOf = (row: Element | null, root: ParentNode) =>
  Array.from((row ?? root).querySelectorAll<HTMLButtonElement>(TAB)).filter((tab) => {
    let parent = tab.parentElement;
    while (parent && !isRow(parent)) parent = parent.parentElement;
    return parent === row;
  });

// A tabs field that has just mounted — inside a tab that was itself just opened — reads the tab saved
// in preferences afterwards and switches to it, over a click made meanwhile. The walk does not wait
// for that: if it happens, the click is made again.
const guardTab = (tab: HTMLButtonElement) => {
  const observer = new MutationObserver(() => {
    if (tab.classList.contains(ACTIVE_TAB)) return;
    observer.disconnect();
    tab.click();
  });
  observer.observe(tab, { attributes: true, attributeFilter: ["class"] });
  setTimeout(() => observer.disconnect(), TAB_GUARD_MS);
};

const openTab = (row: Element | null, index: number | null | undefined, root: ParentNode) => {
  const tab = index == null ? undefined : tabsOf(row, root)[index];
  if (!tab) return { tab: null, clicked: false };
  if (tab.classList.contains(ACTIVE_TAB)) return { tab, clicked: false };
  tab.click();
  guardTab(tab);
  return { tab, clicked: true };
};

// Array and blocks rows alike: `sections-1-blocks-row-3` for row 3 of `sections.1.blocks`.
const findRow = (parentPath: string, index: number, root: ParentNode) =>
  root.querySelector(`[id="${parentPath.split(".").join("-")}-row-${index}"]`);

// A field inside a drawer carries its edit depth: `field-header-2`.
const findField = (path: string, root: ParentNode) => {
  const id = domId(path);
  return (
    Array.from(root.querySelectorAll(`[id^="${id}"]`)).find(
      (el) => el.id === id || new RegExp(`^${id}-\\d+$`, "u").test(el.id)
    ) ?? null
  );
};

/**
 * Walks to `sections.1.blocks.0.items.3` one level at a time: opens the tab the next level sits in,
 * finds the row, expands it through `expandRow`. Stops at the deepest row it reached if one is
 * missing. `within` is where the form is — the page, or a drawer that is still loading. `opened`
 * says whether the form had to change at all.
 */
export const locateRow = async (
  path: string,
  tabs: (number | null)[],
  expandRow: (rowsPath: string, index: number) => boolean,
  within: () => ParentNode | null = () => document
): Promise<{ target: Element | null; opened: boolean }> => {
  const root = await waitFor(() => {
    const candidate = within();
    return candidate?.querySelector('[id^="field-"]') ? candidate : null;
  }, LOAD_MS);
  if (!root) return { target: null, opened: false };

  const segments = path.split(".");
  let row: Element | null = null;
  let opened = false;
  let level = 0;

  for (let i = 0; i < segments.length; i += 1) {
    if (!isIndex(segments[i])) continue;
    opened = openTab(row, tabs[level], root).clicked || opened;
    const parentPath = segments.slice(0, i).join(".");
    const index = Number(segments[i]);
    const next: Element | null = await waitFor(() => findRow(parentPath, index, root));
    if (!next) return { target: row, opened };
    opened = expandRow(parentPath, index) || opened;
    row = next;
    level += 1;
  }

  // A path that ends in a group (`sections.0.priceIncrease`) goes on to that field inside the row.
  if (isIndex(segments[segments.length - 1])) return { target: row, opened };
  const { tab, clicked } = openTab(row, tabs[level], root);
  // A named tab (`footer`) is a path with no field of its own, so its content is the target. A field
  // inside the tab renders together with that content, so once the content is there, so is the field.
  const content = tab?.closest(".tabs-field")?.querySelector(".tabs-field__content-wrap") ?? null;
  const target = await waitFor(
    () => findField(path, root) ?? (content?.querySelector('[id^="field-"]') ? content : null)
  );
  return { target: target ?? row, opened: clicked || opened };
};
