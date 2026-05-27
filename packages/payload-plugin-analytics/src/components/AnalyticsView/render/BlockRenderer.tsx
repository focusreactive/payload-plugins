"use client";

import type { ImportMap } from "payload";
import { RenderServerComponent } from "@payloadcms/ui/elements/RenderServerComponent";
import { ErrorTile } from "../ui/ErrorTile";
import { BUILTIN_BLOCK_COMPONENTS } from "../blocks/builtInRegistry";
import type { BlockComponentProps, BlockId } from "../../../types/layout";

export interface BlockRendererProps extends BlockComponentProps {
  blockId: BlockId;
  componentPath: string;
  importMap?: ImportMap;
}

export function BlockRenderer({ blockId, componentPath, importMap, ...rest }: BlockRendererProps) {
  const BuiltIn = BUILTIN_BLOCK_COMPONENTS[blockId];

  if (BuiltIn) {
    return <BuiltIn {...rest} />;
  }

  if (!componentPath) {
    return (
      <ErrorTile
        error={
          new Error(`Block "${blockId}" has no resolvable component (missing both built-in entry and componentPath).`)
        }
      />
    );
  }

  if (!importMap) {
    return (
      <ErrorTile error={new Error(`Block "${blockId}" cannot render: importMap was not provided to the renderer.`)} />
    );
  }

  return <RenderServerComponent Component={componentPath} clientProps={rest} importMap={importMap} />;
}
