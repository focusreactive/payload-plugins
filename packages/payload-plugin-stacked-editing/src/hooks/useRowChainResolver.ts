"use client";

import { useConfig, useDocumentInfo, useForm, useOperation } from "@payloadcms/ui";
import type { ClientField } from "payload";
import { useCallback } from "react";

import { blockTypeOf } from "../lib/formRows.js";
import { resolveRowChain } from "../lib/resolveRowChain.js";
import type { FieldsPermissions, RowChain } from "../lib/resolveRowChain.js";

export const useDocumentEntity = () => {
  const { getEntityConfig } = useConfig();
  const { collectionSlug, globalSlug } = useDocumentInfo();
  return getEntityConfig({ collectionSlug, globalSlug });
};

export const useRowChainResolver = (): ((rowPath: string) => RowChain) => {
  const { config } = useConfig();
  const { docPermissions } = useDocumentInfo();
  const operation = useOperation() ?? "update";
  const { disabled, getFields } = useForm();
  const entity = useDocumentEntity();
  const documentFields = (entity?.fields ?? []) as ClientField[];

  return useCallback(
    (rowPath: string): RowChain =>
      resolveRowChain({
        blocksMap: config.blocksMap,
        fields: documentFields,
        getBlockType: (row) => blockTypeOf(getFields(), row),
        operation,
        permissions: docPermissions?.fields as FieldsPermissions,
        readOnly: disabled,
        rowPath,
      }),
    [config.blocksMap, disabled, docPermissions, documentFields, getFields, operation]
  );
};
