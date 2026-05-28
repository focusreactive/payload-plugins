"use client";

import { useMemo } from "react";
import type { ImportMap } from "payload";
import { RenderServerComponent } from "@payloadcms/ui/elements/RenderServerComponent";
import { ErrorTile } from "../ui/ErrorTile";
import { BUILTIN_BLOCK_COMPONENTS } from "../blocks/builtInRegistry";
import { useCustomBlockQuery } from "../hooks/queries/useCustomBlockQuery";
import type { BlockComponentProps, BlockId } from "../../../types/layout";

export interface BlockRendererProps extends BlockComponentProps {
  blockId: BlockId;
  componentPath: string;
  hasFetch: boolean;
  importMap?: ImportMap;
}

function CustomBlockShell({
  blockId,
  componentPath,
  importMap,
  ...rest
}: Omit<BlockRendererProps, "hasFetch"> & { importMap: ImportMap }) {
  const query = useMemo(
    () => ({ dateRange: rest.dateRange, comparison: rest.comparison }),
    [rest.dateRange, rest.comparison],
  );
  const { data, isLoading, error } = useCustomBlockQuery<unknown>(blockId, query);

  return (
    <RenderServerComponent
      Component={componentPath}
      clientProps={{ ...rest, data, loading: isLoading, error: error ?? undefined }}
      importMap={importMap}
    />
  );
}

export function BlockRenderer({ blockId, componentPath, hasFetch, importMap, ...rest }: BlockRendererProps) {
  const BuiltIn = BUILTIN_BLOCK_COMPONENTS[blockId];

  if (BuiltIn) {
    return <BuiltIn {...rest} />;
  }

  if (!componentPath) {
    return <ErrorTile error={new Error(`Block "${blockId}" has no resolvable component`)} />;
  }

  if (!importMap) {
    return (
      <ErrorTile error={new Error(`Block "${blockId}" cannot render: importMap was not provided to the renderer.`)} />
    );
  }

  if (hasFetch) {
    return <CustomBlockShell blockId={blockId} componentPath={componentPath} importMap={importMap} {...rest} />;
  }

  return <RenderServerComponent Component={componentPath} clientProps={rest} importMap={importMap} />;
}
