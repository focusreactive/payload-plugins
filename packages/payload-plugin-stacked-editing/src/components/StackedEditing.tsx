"use client";

import {
  useConfig,
  useDocumentInfo,
  useDocumentTitle,
  useForm,
  useFormFields,
  useOperation,
  useTranslation,
} from "@payloadcms/ui";
import type { ClientField, FormState } from "payload";
import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";

import {
  TITLE_FIELD_NAMES,
  createTranslate,
  fieldLabelOf,
  rowLabelOf,
} from "../lib/breadcrumbs.js";
import type { CrumbLevel } from "../lib/breadcrumbs.js";
import { TOGGLE_SELECTOR, rowPathFromToggle } from "../lib/domPath.js";
import { resolveRowChain } from "../lib/resolveRowChain.js";
import type { FieldsPermissions, RowChain, RowLevel } from "../lib/resolveRowChain.js";
import { refreshDetachedEditors } from "../lib/staleEditors.js";
import { OWNER_ATTRIBUTE, STACKED_EDITING_CSS } from "./styles.js";
import { Panel } from "./Panel.js";
import { useConfinedToEditor } from "./useConfinedToEditor.js";

type OpenRows = {
  /** Data path of the deepest open row; every row above it has a panel too. */
  readonly target: string;
  /** Row ids along the chain when it was opened — a row that moved or was removed closes its panel. */
  readonly rowIds: readonly string[];
};

type RowState = { id?: string; blockType?: string; collapsed?: boolean };

const rowsOf = (fields: FormState, fieldPath: string): RowState[] | undefined =>
  fields[fieldPath]?.rows as RowState[] | undefined;

const pathPrefixes = (path: string): string[] => {
  const segments = path.split(".");
  return segments.map((_, index) => segments.slice(0, index + 1).join("."));
};

const LABEL_FIELDS = ["blockName", ...TITLE_FIELD_NAMES];

/**
 * A string that changes whenever something the open chain depends on changes: the rows (ids and
 * block types) of every array/blocks field on the way to the target, and the title-like values the
 * breadcrumbs show. Selecting a string keeps `useFormFields` from re-rendering on every keystroke
 * elsewhere in the document.
 */
const chainSignature = (fields: FormState, target: string | undefined): string => {
  if (!target) {
    return "";
  }
  const parts: string[] = [];
  for (const prefix of pathPrefixes(target)) {
    const rows = rowsOf(fields, prefix);
    if (rows) {
      parts.push(`${prefix}=${rows.map((row) => `${row.id}:${row.blockType ?? ""}`).join(",")}`);
    }
    for (const name of LABEL_FIELDS) {
      const value = fields[`${prefix}.${name}`]?.value;
      if (typeof value === "string") {
        parts.push(`${prefix}.${name}=${value}`);
      }
    }
  }
  return parts.join("|");
};

/** The open chain, cut at the first row that no longer is the row that was opened. */
const stillOpen = (chain: RowChain, open: OpenRows, fields: FormState): RowLevel[] => {
  const levels: RowLevel[] = [];
  for (const [index, level] of chain.levels.entries()) {
    const id = rowsOf(fields, level.fieldPath)?.[level.rowIndex]?.id;
    if (id === undefined || id !== open.rowIds[index]) {
      break;
    }
    levels.push(level);
  }
  return levels;
};

/**
 * Inline copies of a row's fields stay mounted (hidden) under an open panel, so a `<label for>` in
 * the panel would focus the hidden twin, which comes first in the document. Focus the panel's own.
 */
const focusLabelTarget = (event: MouseEvent, target: Element, ownerId: string) => {
  const label = target.closest("label[for]");
  const panel = label?.closest(`[${OWNER_ATTRIBUTE}="${ownerId}"]`);
  if (!(label instanceof HTMLLabelElement) || !panel || panel.tagName === "FORM") {
    return;
  }
  const own = panel.querySelector<HTMLElement>(`#${CSS.escape(label.htmlFor)}`);
  if (own && document.querySelector(`#${CSS.escape(label.htmlFor)}`) !== own) {
    event.preventDefault();
    own.focus();
  }
};

const useLatest = <T,>(value: T) => {
  const ref = useRef(value);
  ref.current = value;
  return ref;
};

/**
 * Mounted once per edit view (in `beforeDocumentControls`, i.e. inside the document form). Turns a
 * click on an array/blocks row header into a stack of drawers — one per level down to that row —
 * each rendering the row's fields with Payload's own `RenderFields`, bound to the same form.
 */
export const StackedEditing = () => {
  const ownerId = useId().replaceAll(/[^a-zA-Z0-9]/gu, "");
  const markerRef = useRef<HTMLSpanElement>(null);
  const [open, setOpen] = useState<OpenRows | null>(null);

  const { config, getEntityConfig } = useConfig();
  const { collectionSlug, docPermissions, globalSlug } = useDocumentInfo();
  const { title } = useDocumentTitle();
  const operation = useOperation() ?? "update";
  const { i18n, t } = useTranslation();
  const { disabled, dispatchFields, getFields } = useForm();
  const signature = useFormFields(([fields]) => chainSignature(fields, open?.target));

  const entity = getEntityConfig({ collectionSlug, globalSlug });
  const documentFields = (entity?.fields ?? []) as ClientField[];
  const translate = useMemo(
    () =>
      createTranslate({
        fallbackLanguage: i18n.fallbackLanguage,
        language: i18n.language,
        t: t as (key: string) => string,
      }),
    [i18n.fallbackLanguage, i18n.language, t]
  );

  const resolve = useCallback(
    (rowPath: string): RowChain =>
      resolveRowChain({
        blocksMap: config.blocksMap,
        fields: documentFields,
        getBlockType: ({ fieldPath, rowIndex, rowPath: path }) => {
          const fields = getFields();
          const fromRows = rowsOf(fields, fieldPath)?.[rowIndex]?.blockType;
          const fromField = fields[`${path}.blockType`]?.value;
          return fromRows ?? (typeof fromField === "string" ? fromField : undefined);
        },
        operation,
        permissions: docPermissions?.fields as FieldsPermissions,
        readOnly: disabled,
        rowPath,
      }),
    [config.blocksMap, disabled, docPermissions, documentFields, getFields, operation]
  );

  // `signature` is read so the chain is re-resolved when rows move, change type or get renamed.
  const levels = useMemo(() => {
    if (!open || signature === undefined) {
      return [];
    }
    return stillOpen(resolve(open.target), open, getFields());
  }, [getFields, open, resolve, signature]);

  const levelsRef = useLatest(levels);

  /** Keep the first `keep` panels and close the rest; `0` closes them all. */
  const navigate = useCallback(
    (keep: number) => {
      const current = levelsRef.current;
      const firstClosed = current[keep];
      if (!firstClosed) {
        return;
      }
      refreshDetachedEditors({ dispatchFields, getFields, rowPath: firstClosed.rowPath });
      const last = current[keep - 1];
      setOpen((previous) =>
        last && previous ? { target: last.rowPath, rowIds: previous.rowIds.slice(0, keep) } : null
      );
    },
    [dispatchFields, getFields, levelsRef]
  );

  // A row that was moved, removed or changed block type while its panel was open closes the panel.
  useEffect(() => {
    if (open && levels.length < open.rowIds.length) {
      const last = levels.at(-1);
      setOpen(last ? { target: last.rowPath, rowIds: open.rowIds.slice(0, levels.length) } : null);
    }
  }, [levels, open]);

  const openRow = useCallback(
    (rowPath: string): boolean => {
      const chain = resolve(rowPath);
      if (!chain.complete) {
        return false;
      }
      const fields = getFields();
      const rowIds: string[] = [];
      for (const level of chain.levels) {
        const rows = rowsOf(fields, level.fieldPath) ?? [];
        const row = rows[level.rowIndex];
        if (!row?.id) {
          return false;
        }
        rowIds.push(row.id);
        // Collapse the inline row: its fields stay mounted (Payload keeps collapsed rows mounted)
        // but hidden, so only the panel copy is visible and focusable.
        if (!row.collapsed) {
          dispatchFields({
            type: "SET_ROW_COLLAPSED",
            path: level.fieldPath,
            updatedRows: rows.map((candidate) =>
              candidate.id === row.id ? { ...candidate, collapsed: true } : candidate
            ),
          } as Parameters<typeof dispatchFields>[0]);
        }
      }
      setOpen({ target: rowPath, rowIds });
      return true;
    },
    [dispatchFields, getFields, resolve]
  );

  const openRowRef = useLatest(openRow);

  useEffect(() => {
    const form = markerRef.current?.closest("form");
    form?.setAttribute(OWNER_ATTRIBUTE, ownerId);

    const isOwn = (element: Element): boolean => {
      const scope = element.closest(`form, [${OWNER_ATTRIBUTE}]`);
      return scope !== null && scope.getAttribute(OWNER_ATTRIBUTE) === ownerId;
    };

    const onClick = (event: MouseEvent) => {
      if (event.button !== 0 || event.defaultPrevented || !(event.target instanceof Element)) {
        return;
      }
      const { target } = event;
      const toggle = target.closest(TOGGLE_SELECTOR);
      if (!toggle) {
        focusLabelTarget(event, target, ownerId);
        return;
      }
      // Alt/Option-click keeps Payload's inline expand/collapse.
      if (event.altKey || !isOwn(toggle)) {
        return;
      }
      const rowPath = rowPathFromToggle(toggle);
      if (rowPath && openRowRef.current(rowPath)) {
        event.preventDefault();
        event.stopPropagation();
      }
    };

    document.addEventListener("click", onClick, true);
    return () => {
      document.removeEventListener("click", onClick, true);
      form?.removeAttribute(OWNER_ATTRIBUTE);
    };
  }, [openRowRef, ownerId]);

  const getValue = useCallback((path: string) => getFields()[path]?.value, [getFields]);
  const crumbLevels: CrumbLevel[] = levels.map((level) => {
    const row = rowLabelOf(level, translate, getValue);
    return {
      fieldLabel: fieldLabelOf(level, translate),
      rowLabel: row.title ?? row.label,
      rowPath: level.rowPath,
    };
  });
  const documentTitle =
    title ||
    translate((entity as { labels?: { singular?: unknown } } | null)?.labels?.singular) ||
    "Document";

  const confined = useConfinedToEditor({ active: levels.length > 0, markerRef });

  return (
    <>
      <span hidden ref={markerRef} />
      <style href="focus-reactive-stacked-editing" precedence="default">
        {STACKED_EDITING_CSS}
      </style>
      {levels.length > 0 ? (
        <Panel
          confined={confined}
          crumbLevels={crumbLevels}
          depth={0}
          documentTitle={documentTitle}
          levels={levels}
          onNavigate={navigate}
          ownerId={ownerId}
          translate={translate}
        />
      ) : null}
    </>
  );
};
