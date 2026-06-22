"use client";

import type { RowLabelProps } from "@payloadcms/ui";
import { useRowLabel } from "@payloadcms/ui";
import React from "react";

import { readPath } from "../readPath";

type Props = RowLabelProps & {
  fallbackLabel?: string;
  titleField?: string;
};

export const BlockLabel: React.FC<Props> = ({ fallbackLabel, titleField }) => {
  const { data } = useRowLabel<Record<string, unknown>>();
  const titleText = titleField ? readPath(data, titleField) : null;
  const titleString = typeof titleText === "string" ? titleText : undefined;

  if (titleString) {
    return (
      <>
        <span className="capitalize">{fallbackLabel || (data?.["blockType"] as string | undefined)}</span> — <span>{titleString}</span>
      </>
    );
  }

  return <span className="capitalize">{fallbackLabel || (data?.["blockType"] as string | undefined) || "Block"}</span>;
};
