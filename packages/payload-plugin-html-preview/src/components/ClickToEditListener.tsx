"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { DefaultDocumentIDType } from "payload";
import {
  useConfig,
  useDocumentDrawer,
  useDocumentInfo,
  useForm,
  usePreferences,
} from "@payloadcms/ui";
import { PREVIEW_MESSAGE } from "../lib/constants.js";
import { locateRow, planTabs } from "../lib/locateRow.js";
import { revealRow } from "../lib/revealRow.js";

type Row = { id: string; collapsed?: boolean };
type FormFields = Record<string, { rows?: Row[] } | undefined>;
type DocTarget = { collectionSlug: string; id: DefaultDocumentIDType; field?: string };
type EditMessage = { type?: unknown; id?: unknown; field?: unknown; doc?: unknown };

const SLUG = /^[\w-]+$/u;
const FIELD = /^\w+$/u;

// The row's form path, found by its id among every array and blocks field — ids survive reordering
// and hidden rows, and any template can print one, which an index path cannot promise.
const pathOf = (fields: FormFields, id: string) => {
  for (const [path, field] of Object.entries(fields)) {
    const index = field?.rows?.findIndex((row) => row.id === id) ?? -1;
    if (index >= 0) return `${path}.${index}`;
  }
  return null;
};

// The form path of a focused element: its field's wrapper (`field-sections__0__title`), or the row it
// sits in when it is a row's own control (`sections-0-widgets-row-1`). Drawers are other documents.
const focusedPath = (el: Element) => {
  if (el.closest(".drawer")) return null;
  for (let node: Element | null = el; node; node = node.parentElement) {
    const field = /^field-(\w+)$/u.exec(node.id);
    if (field) return field[1].replace(/__/gu, ".");
    const row = /^([\w-]+)-row-(\d+)$/u.exec(node.id);
    if (row && !node.id.startsWith("scroll-")) return `${row[1].replace(/-/gu, ".")}.${row[2]}`;
  }
  return null;
};

// The ids of every row on the way to `path`, innermost first, and the group named right after the
// innermost one — what the preview looks for, falling back outwards when a row is not on the page.
const rowsOn = (fields: FormFields, path: string) => {
  const segments = path.split(".");
  const ids: string[] = [];
  let field: string | undefined;
  segments.forEach((segment, i) => {
    if (!/^\d+$/u.test(segment)) return;
    const id = fields[segments.slice(0, i).join(".")]?.rows?.[Number(segment)]?.id;
    if (!id) return;
    ids.unshift(id);
    field = segments[i + 1] && !/^\d+$/u.test(segments[i + 1]) ? segments[i + 1] : undefined;
  });
  return { ids, field };
};

const reveal = (path: string, located: ReturnType<typeof locateRow>) =>
  located.then(({ target, opened }) => {
    if (target) return revealRow(target, opened);
    console.warn(`Click-to-edit: nothing found for ${path} — has the admin's markup changed?`);
  });

type Preferences = { fields?: Record<string, { tabIndex?: number } | undefined> } | null;

// Another document from the preview — the conference behind the header, a FAQ entry — in Payload's
// own drawer, over the page and its unsaved edits. `field` is then opened inside the drawer.
const DocumentTarget = ({ target, onClose }: { target: DocTarget; onClose: () => void }) => {
  const { config } = useConfig();
  const { getPreference, setPreference } = usePreferences();
  const [Drawer, , { openDrawer, isDrawerOpen, drawerSlug }] = useDocumentDrawer({
    collectionSlug: target.collectionSlug,
    id: target.id,
  });
  const wasOpen = useRef(false);
  const fields =
    config.collections.find((collection) => collection.slug === target.collectionSlug)?.fields ??
    [];
  const tabs = target.field
    ? planTabs(fields as never, config.blocksMap as never, {}, target.field)
    : [];

  useEffect(() => {
    // A tabs field opens on the tab saved in the document's preferences, under `tabs-<its index>`
    // (or its name, when it has one). Saved before the drawer opens, the document opens on the
    // field's tab — nothing to click, and nothing to race.
    const open = async () => {
      const tabsIndex = fields.findIndex((field) => field.type === "tabs");
      const tabIndex = tabs[0];
      if (tabsIndex >= 0 && tabIndex != null) {
        const tabsField = fields[tabsIndex] as { name?: string };
        const prefKey = tabsField.name ?? `tabs-${tabsIndex}`;
        const key = `collection-${target.collectionSlug}-${target.id}`;
        const current = ((await getPreference(key)) as Preferences) ?? {};
        void setPreference(key, {
          ...current,
          fields: { ...current.fields, [prefKey]: { ...current.fields?.[prefKey], tabIndex } },
        });
      }
      openDrawer();
    };
    void open();
    // Opened once, for this target; the component is keyed by it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (isDrawerOpen) wasOpen.current = true;
    else if (wasOpen.current) onClose();
  }, [isDrawerOpen, onClose]);

  useEffect(() => {
    if (!isDrawerOpen || !target.field) return;
    const drawer = () =>
      document.querySelector(`[id="close-drawer__${drawerSlug}"]`)?.closest(".drawer") ?? null;
    void reveal(
      target.field,
      locateRow(target.field, tabs, () => false, drawer)
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDrawerOpen, drawerSlug]);

  return <Drawer />;
};

/**
 * Click-to-edit: the frame posts what was clicked, and this opens it; a field focused in the form is
 * posted back, and the frame shows its row.
 * - a row of this document (`id`, and `field` for a group in it) — in the form, tab and row opened;
 * - another document (`doc` = `collection:id`, optional `field`) — in a drawer.
 * Mounted in the document controls, which sit inside the form: the tab each level sits in is read
 * from the form's own data, and rows are expanded through its state.
 */
export const ClickToEditListener = () => {
  const { config } = useConfig();
  const { collectionSlug, setDocFieldPreferences } = useDocumentInfo();
  const form = useForm();
  const latest = useRef({ form, setDocFieldPreferences });
  latest.current = { form, setDocFieldPreferences };
  const [docTarget, setDocTarget] = useState<(DocTarget & { key: number }) | null>(null);
  const closeDoc = useCallback(() => setDocTarget(null), []);

  useEffect(() => {
    const fields =
      config.collections.find((collection) => collection.slug === collectionSlug)?.fields ?? [];

    // What the row's own toggle does: the row opens in form state and stays open on reload.
    const expandRow = (rowsPath: string, index: number) => {
      const { form: currentForm, setDocFieldPreferences: savePreferences } = latest.current;
      const rows = (currentForm.getFields() as FormFields)[rowsPath]?.rows;
      if (!rows?.[index]?.collapsed) return false;
      const updatedRows = rows.map((row, i) => (i === index ? { ...row, collapsed: false } : row));
      currentForm.dispatchFields({ type: "SET_ROW_COLLAPSED", path: rowsPath, updatedRows });
      void savePreferences(rowsPath, {
        collapsed: updatedRows.filter((row) => row.collapsed).map((row) => row.id),
      });
      return true;
    };

    const openRow = (id: string, field?: string) => {
      const rowPath = pathOf(latest.current.form.getFields() as FormFields, id);
      if (!rowPath)
        return console.warn(`Click-to-edit: no row ${id} in this form — was it removed?`);
      const path = field ? `${rowPath}.${field}` : rowPath;
      const tabs = planTabs(
        fields as never,
        config.blocksMap as never,
        latest.current.form.getData(),
        path
      );
      void reveal(path, locateRow(path, tabs, expandRow));
    };

    const openDoc = (doc: string, field?: string) => {
      const [slug, id] = doc.split(":");
      if (!config.collections.some((collection) => collection.slug === slug))
        return console.warn(`Click-to-edit: no collection ${slug}`);
      // Postgres ids are numbers, MongoDB's are strings; the attribute is text either way.
      setDocTarget({
        collectionSlug: slug,
        id: (/^\d+$/u.test(id) ? Number(id) : id) as DefaultDocumentIDType,
        field,
        key: Date.now(),
      });
    };

    const onMessage = (event: MessageEvent) => {
      const iframe = document.querySelector("#live-preview-iframe") as HTMLIFrameElement | null;
      if (!iframe || event.source !== iframe.contentWindow) return;

      const data = event.data as EditMessage | null;
      if (!data || data.type !== PREVIEW_MESSAGE) return;
      const field =
        typeof data.field === "string" && FIELD.test(data.field) ? data.field : undefined;
      if (data.field !== undefined && !field) return;

      if (typeof data.id === "string" && SLUG.test(data.id)) return openRow(data.id, field);
      if (typeof data.doc === "string" && /^[\w-]+:[\w-]+$/u.test(data.doc))
        return openDoc(data.doc, field);
    };

    // The other way round: the row being edited is shown in the preview. Sent when it changes, not
    // for every input in it.
    let lastFocus = "";
    const onFocus = (event: FocusEvent) => {
      const iframe = document.querySelector("#live-preview-iframe") as HTMLIFrameElement | null;
      const path =
        iframe?.contentWindow && event.target instanceof Element ? focusedPath(event.target) : null;
      if (!iframe?.contentWindow || !path) return;
      const { ids, field } = rowsOn(latest.current.form.getFields() as FormFields, path);
      const key = `${ids.join(",")}|${field ?? ""}`;
      if (!ids.length || key === lastFocus) return;
      lastFocus = key;
      iframe.contentWindow.postMessage(
        { type: PREVIEW_MESSAGE, ids, field },
        window.location.origin
      );
    };

    window.addEventListener("message", onMessage);
    document.addEventListener("focusin", onFocus);
    return () => {
      window.removeEventListener("message", onMessage);
      document.removeEventListener("focusin", onFocus);
    };
  }, [config, collectionSlug]);

  return docTarget ? (
    <DocumentTarget key={docTarget.key} target={docTarget} onClose={closeDoc} />
  ) : null;
};
