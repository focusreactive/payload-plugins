"use client";

import type { BlocksFieldClient, FieldState, FormState } from "payload";
import type { ReactNode } from "react";

import { BlockLabelWithPresets } from "../presetActions/index.js";

const LOCAL_STORAGE_CLIPBOARD_KEY = "_payloadClipboard";

interface ClipboardPayload {
  data: Record<string, FieldState>;
  path: string;
  type: string;
}

interface ReduceFormStateByPathArgs {
  formState: FormState;
  path: string;
}

export function reduceFormStateByPath({
  formState,
  path,
}: ReduceFormStateByPathArgs) {
  const filteredState: FormState = {};

  for (const key in formState) {
    if (!key.startsWith(path)) {
      continue;
    }

    const {
      customComponents: _customComponents,
      validate: _validate,
      ...field
    } = formState[key];

    if (Array.isArray(field.rows)) {
      field.rows = field.rows.map((row) => {
        if (!row || typeof row !== "object") {
          return row;
        }

        const { customComponents: _rowCustomComponents, ...serializableRow } =
          row;

        return serializableRow;
      });
    }

    filteredState[key] = field;
  }

  return filteredState;
}

interface MergeBlocksFormStateArgs {
  blocks: BlocksFieldClient["blocks"];
  currentFieldState: FieldState | undefined;
  existingFieldComponent: ReactNode;
  path: string;
  state: FormState;
}

export function hydrateBlocksFieldCustomComponents({
  blocks,
  currentFieldState,
  existingFieldComponent,
  path,
  state,
}: MergeBlocksFormStateArgs) {
  const nextState = { ...state };
  const fieldState = nextState[path];

  if (!fieldState) {
    return nextState;
  }

  const rows = Array.isArray(fieldState.rows) ? fieldState.rows : [];

  nextState[path] = {
    ...fieldState,
    customComponents: {
      ...currentFieldState?.customComponents,
      ...fieldState.customComponents,
      Field: existingFieldComponent,
    },
    rows: rows.map((row) => {
      if (!row || typeof row !== "object" || !("blockType" in row)) {
        return row;
      }

      const {blockType} = row;
      const hasMatchingBlock = blocks.some((block) => typeof block === "string"
          ? block === blockType
          : block.slug === blockType);

      if (!hasMatchingBlock) {
        return row;
      }

      return {
        ...row,
        customComponents: {
          ...row.customComponents,
          RowLabel: <BlockLabelWithPresets />,
        },
      };
    }),
  };

  return nextState;
}

function readClipboardPayload() {
  try {
    const rawValue = localStorage.getItem(LOCAL_STORAGE_CLIPBOARD_KEY);

    if (!rawValue) {
      return null;
    }

    const parsedValue = JSON.parse(rawValue) as ClipboardPayload;

    if (
      !parsedValue ||
      typeof parsedValue !== "object" ||
      typeof parsedValue.path !== "string" ||
      typeof parsedValue.type !== "string" ||
      !parsedValue.data ||
      typeof parsedValue.data !== "object"
    ) {
      return null;
    }

    return parsedValue;
  } catch {
    return null;
  }
}

interface BlocksClipboardArgs {
  blocks: BlocksFieldClient["blocks"];
  currentFieldState: FieldState | undefined;
  existingFieldComponent: React.ReactNode;
  formState: FormState;
  path: string;
  type: string;
}

export function copyBlocksFieldToClipboard({
  formState,
  path,
  type,
}: Pick<BlocksClipboardArgs, "formState" | "path" | "type">) {
  const payload: ClipboardPayload = {
    data: reduceFormStateByPath({ formState, path }),
    path,
    type,
  };

  localStorage.setItem(LOCAL_STORAGE_CLIPBOARD_KEY, JSON.stringify(payload));
}

export function pasteBlocksFieldFromClipboard({
  blocks,
  currentFieldState,
  existingFieldComponent,
  formState,
  path,
  type,
}: BlocksClipboardArgs) {
  const clipboardPayload = readClipboardPayload();

  if (!clipboardPayload || clipboardPayload.type !== type) {
    return null;
  }

  const pathToReplace = clipboardPayload.path;
  const targetSegment = path;
  const nextState = { ...formState };

  for (const clipboardPath in clipboardPayload.data) {
    if (!clipboardPath.startsWith(pathToReplace)) {
      continue;
    }

    const newPath = clipboardPath.replace(pathToReplace, targetSegment);
    const validate = nextState[newPath]?.validate;

    nextState[newPath] = {
      validate,
      ...clipboardPayload.data[clipboardPath],
    };
  }

  return hydrateBlocksFieldCustomComponents({
    blocks,
    currentFieldState,
    existingFieldComponent,
    path,
    state: nextState,
  });
}
