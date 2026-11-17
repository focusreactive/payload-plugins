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

import { createTranslate, fieldLabelOf, rowLabelOf } from "../lib/breadcrumbs.js";
import type { CrumbLevel } from "../lib/breadcrumbs.js";
import { rowsSignature, rowsToCollapse } from "../lib/collapseRows.js";
import {
  FIELD_ID_PREFIX,
  TOGGLE_SELECTOR,
  fieldPathFromDomId,
  rowPathFromToggle,
} from "../lib/domPath.js";
import { classifyHeaderClick } from "../lib/headerClick.js";
import type { DefaultMode } from "../lib/headerClick.js";
import {
  OPEN_FIELD_EVENT,
  isForDocument,
  rowDepthOf,
  rowPathCandidates,
} from "../lib/openField.js";
import { resolveRowChain } from "../lib/resolveRowChain.js";
import type { FieldsPermissions, RowChain, RowLevel } from "../lib/resolveRowChain.js";
import { refreshDetachedEditors } from "../lib/staleEditors.js";
import { MODE_ATTRIBUTE, OWNER_ATTRIBUTE, STACKED_EDITING_CSS } from "./styles.js";
import { focusFieldInTopPanel } from "./focusField.js";
import { Panel } from "./Panel.js";
import { useConfinedToEditor } from "./useConfinedToEditor.js";

type OpenRows = {
  readonly deepestRowPath: string;
  readonly rowIdsAtOpen: readonly string[];
};

type RowState = { id?: string; blockType?: string; collapsed?: boolean };

const rowsOf = (fields: FormState, fieldPath: string): RowState[] | undefined =>
  fields[fieldPath]?.rows as RowState[] | undefined;

const pathPrefixes = (path: string): string[] => {
  const segments = path.split(".");
  return segments.map((_, index) => segments.slice(0, index + 1).join("."));
};

const ROW_PATH = /\.\d+$/u;

const ownTextValues = (fields: FormState, rowPath: string): string[] => {
  const childPrefix = `${rowPath}.`;
  const values: string[] = [];
  for (const [path, field] of Object.entries(fields)) {
    const { value } = field as { value?: unknown };
    const isDirectChild =
      path.startsWith(childPrefix) && !path.slice(childPrefix.length).includes(".");
    if (isDirectChild && (typeof value === "string" || typeof value === "number")) {
      values.push(`${path}=${value}`);
    }
  }
  return values;
};

const chainSignature = (fields: FormState, deepestRowPath: string | undefined): string => {
  if (!deepestRowPath) {
    return "";
  }
  const parts: string[] = [];
  for (const prefix of pathPrefixes(deepestRowPath)) {
    const rows = rowsOf(fields, prefix);
    if (rows) {
      parts.push(`${prefix}=${rows.map((row) => `${row.id}:${row.blockType ?? ""}`).join(",")}`);
    }
    if (ROW_PATH.test(prefix)) {
      parts.push(...ownTextValues(fields, prefix));
    }
  }
  return parts.join("|");
};

const levelsWithUnchangedRows = (
  chain: RowChain,
  open: OpenRows,
  fields: FormState
): RowLevel[] => {
  const levels: RowLevel[] = [];
  for (const [index, level] of chain.levels.entries()) {
    const id = rowsOf(fields, level.fieldPath)?.[level.rowIndex]?.id;
    if (id === undefined || id !== open.rowIdsAtOpen[index]) {
      break;
    }
    levels.push(level);
  }
  return levels;
};

// The row's hidden inline copy comes first in the DOM, so a panel label would focus that twin.
const focusPanelInputOfLabel = (event: MouseEvent, target: Element, ownerId: string) => {
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

const PENDING_TOGGLE_MS = 1500;
const COLLAPSE_RECHECK_FRAMES = 10;

const useLatest = <T,>(value: T) => {
  const ref = useRef(value);
  ref.current = value;
  return ref;
};

export const StackedEditing = ({ defaultMode = "panel" }: { defaultMode?: DefaultMode }) => {
  const ownerId = useId().replaceAll(/[^a-zA-Z0-9]/gu, "");
  const markerRef = useRef<HTMLSpanElement>(null);
  const [open, setOpen] = useState<OpenRows | null>(null);

  const { config, getEntityConfig } = useConfig();
  const { collectionSlug, docPermissions, globalSlug, id } = useDocumentInfo();
  const { title } = useDocumentTitle();
  const operation = useOperation() ?? "update";
  const { i18n, t } = useTranslation();
  const { disabled, dispatchFields, getFields } = useForm();
  const signature = useFormFields(([fields]) => chainSignature(fields, open?.deepestRowPath));
  const collapseByDefault = defaultMode === "panel";
  const allRows = useFormFields(([fields]) => (collapseByDefault ? rowsSignature(fields) : ""));
  const collapseMemory = useRef({
    fieldsJustToggledByEditor: new Set<string>(),
    rowsExpandedByEditor: new Set<string>(),
  });

  useEffect(() => {
    if (!collapseByDefault || !allRows) {
      return;
    }
    // Payload's initial REPLACE_STATE can land on an identical signature, so re-check for a few frames.
    let frame = 0;
    let attempts = COLLAPSE_RECHECK_FRAMES;
    const apply = () => {
      const actions = rowsToCollapse(getFields(), collapseMemory.current);
      for (const { path, updatedRows } of actions) {
        dispatchFields({ type: "SET_ROW_COLLAPSED", path, updatedRows } as Parameters<
          typeof dispatchFields
        >[0]);
      }
      attempts -= 1;
      if (attempts > 0) {
        frame = requestAnimationFrame(apply);
      }
    };
    apply();
    return () => cancelAnimationFrame(frame);
  }, [allRows, collapseByDefault, dispatchFields, getFields]);

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

  const levels = useMemo(() => {
    if (!open || signature === undefined) {
      return [];
    }
    return levelsWithUnchangedRows(resolve(open.deepestRowPath), open, getFields());
  }, [getFields, open, resolve, signature]);

  const levelsRef = useLatest(levels);

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
        last && previous
          ? { deepestRowPath: last.rowPath, rowIdsAtOpen: previous.rowIdsAtOpen.slice(0, keep) }
          : null
      );
    },
    [dispatchFields, getFields, levelsRef]
  );

  useEffect(() => {
    if (open && levels.length < open.rowIdsAtOpen.length) {
      const last = levels.at(-1);
      setOpen(
        last
          ? {
              deepestRowPath: last.rowPath,
              rowIdsAtOpen: open.rowIdsAtOpen.slice(0, levels.length),
            }
          : null
      );
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
        collapseMemory.current.rowsExpandedByEditor.delete(row.id);
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
      setOpen({ deepestRowPath: rowPath, rowIdsAtOpen: rowIds });
      return true;
    },
    [dispatchFields, getFields, resolve]
  );

  const openRowRef = useLatest(openRow);
  const documentRef = useLatest({ collectionSlug, globalSlug, id });

  useEffect(() => {
    let cancelFocus: (() => void) | undefined;
    const onOpenField = (event: Event) => {
      const { detail } = event as CustomEvent<unknown>;
      if (!isForDocument(detail as Record<string, string>, documentRef.current)) {
        return;
      }
      const { path } = detail as { path: string };
      for (const rowPath of rowPathCandidates(path)) {
        if (openRowRef.current(rowPath)) {
          event.preventDefault();
          cancelFocus?.();
          cancelFocus = focusFieldInTopPanel({
            depth: rowDepthOf(rowPath),
            ownerId,
            path,
          });
          return;
        }
      }
      setOpen(null);
    };
    window.addEventListener(OPEN_FIELD_EVENT, onOpenField);
    return () => {
      cancelFocus?.();
      window.removeEventListener(OPEN_FIELD_EVENT, onOpenField);
    };
  }, [documentRef, openRowRef, ownerId]);

  const modeRef = useLatest(defaultMode);

  useEffect(() => {
    const form = markerRef.current?.closest("form");
    form?.setAttribute(OWNER_ATTRIBUTE, ownerId);
    form?.setAttribute(MODE_ATTRIBUTE, modeRef.current);

    const isOwn = (element: Element): boolean => {
      const scope = element.closest(`form, [${OWNER_ATTRIBUTE}]`);
      return scope !== null && scope.getAttribute(OWNER_ATTRIBUTE) === ownerId;
    };

    const rememberToggle = (fieldPath: string) => {
      const { fieldsJustToggledByEditor } = collapseMemory.current;
      fieldsJustToggledByEditor.add(fieldPath);
      setTimeout(() => fieldsJustToggledByEditor.delete(fieldPath), PENDING_TOGGLE_MS);
    };
    const rememberHeaderAction = (target: Element) => {
      const action = target.closest(".blocks-field__header-actions, .array-field__header-actions");
      const wrapper = action?.closest(`.field-type[id^="${FIELD_ID_PREFIX}"]`);
      const fieldPath = wrapper && isOwn(wrapper) ? fieldPathFromDomId(wrapper.id) : null;
      if (fieldPath) {
        rememberToggle(fieldPath);
      }
    };

    const onClick = (event: MouseEvent) => {
      if (event.button !== 0 || event.defaultPrevented || !(event.target instanceof Element)) {
        return;
      }
      const { target } = event;
      const toggle = target.closest(TOGGLE_SELECTOR);
      if (!toggle) {
        rememberHeaderAction(target);
        focusPanelInputOfLabel(event, target, ownerId);
        return;
      }
      if (!isOwn(toggle)) {
        return;
      }
      const rowPath = rowPathFromToggle(toggle);
      if (!rowPath) {
        return;
      }
      const actionsWrap = toggle.parentElement?.querySelector(
        ":scope > .collapsible__actions-wrap"
      );
      const chevron = actionsWrap?.querySelector(":scope > .collapsible__indicator");
      const isKeyboardActivation = event.detail === 0;
      const action = classifyHeaderClick({
        actionsWrap: actionsWrap?.getBoundingClientRect(),
        chevron: chevron?.getBoundingClientRect(),
        mode: modeRef.current,
        point: isKeyboardActivation ? null : { x: event.clientX, y: event.clientY },
      });
      if (action === "inline" || event.altKey) {
        rememberToggle(rowPath.slice(0, rowPath.lastIndexOf(".")));
        return;
      }
      if (openRowRef.current(rowPath)) {
        event.preventDefault();
        event.stopPropagation();
      }
    };

    document.addEventListener("click", onClick, true);
    return () => {
      document.removeEventListener("click", onClick, true);
      form?.removeAttribute(OWNER_ATTRIBUTE);
      form?.removeAttribute(MODE_ATTRIBUTE);
    };
  }, [modeRef, openRowRef, ownerId]);

  const getValue = useCallback((path: string) => getFields()[path]?.value, [getFields]);
  const getRowCount = useCallback(
    (path: string) => (getFields()[path]?.rows as unknown[] | undefined)?.length,
    [getFields]
  );
  const crumbLevels: CrumbLevel[] = levels.map((level) => {
    const row = rowLabelOf(level, translate, getValue, getRowCount);
    const rowHint = level.block
      ? translate(level.block.labels?.singular) || level.block.slug
      : undefined;
    return {
      fieldLabel: fieldLabelOf(level, translate),
      rowLabel: row.title ?? row.label,
      rowPath: level.rowPath,
      ...(rowHint ? { rowHint } : {}),
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
          mode={defaultMode}
          onNavigate={navigate}
          ownerId={ownerId}
          translate={translate}
        />
      ) : null}
    </>
  );
};
