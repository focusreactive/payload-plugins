"use client";

import { useMemo } from "react";
import type { ComponentType } from "react";
import { ErrorTile } from "../ui/ErrorTile";
import { BUILTIN_BLOCK_COMPONENTS } from "../blocks/builtInRegistry";
import { useCustomBlockQuery } from "../hooks/queries/useCustomBlockQuery";
import type { BlockComponentProps, BlockId } from "../../../types/layout";

export interface BlockRendererProps extends BlockComponentProps {
  blockId: BlockId;
  Component?: ComponentType<Record<string, unknown>>;
  hasFetch: boolean;
}

function CustomBlockShell({
  blockId,
  Component,
  ...rest
}: Omit<BlockRendererProps, "hasFetch"> & { Component: ComponentType<Record<string, unknown>> }) {
  const query = useMemo(
    () => ({ dateRange: rest.dateRange, comparison: rest.comparison }),
    [rest.dateRange, rest.comparison]
  );
  const { data, isLoading, error } = useCustomBlockQuery<unknown>(blockId, query);

  return (
    <Component
      {...(rest as unknown as Record<string, unknown>)}
      data={data}
      loading={isLoading}
      error={error ?? undefined}
    />
  );
}

export function BlockRenderer({ blockId, Component, hasFetch, ...rest }: BlockRendererProps) {
  const BuiltIn = BUILTIN_BLOCK_COMPONENTS[blockId];
  const propsWithClass = { ...rest, className: "h-full" };

  if (BuiltIn) {
    return <BuiltIn {...propsWithClass} />;
  }

  if (!Component) {
    return (
      <ErrorTile
        error={new Error(`Block "${blockId}" has no resolvable component`)}
        className={propsWithClass.className}
      />
    );
  }

  if (hasFetch) {
    return <CustomBlockShell blockId={blockId} Component={Component} {...propsWithClass} />;
  }

  return <Component {...(propsWithClass as unknown as Record<string, unknown>)} />;
}
