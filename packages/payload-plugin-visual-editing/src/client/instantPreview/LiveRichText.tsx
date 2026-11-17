"use client";

import type { ReactNode } from "react";

import { Fragment, useContext } from "react";

import type { LiveRichTextIdentity } from "./liveRichTextOf.js";
import type { LiveRichTextAction, LiveRichTextRender } from "./unsavedRender/useUnsavedRender.js";

import { keyedFieldAddressOf } from "../../shared/veDocument.js";
import { OverlayScopeContext } from "../overlayContext.js";
import { UnsavedRenderBoundary } from "./unsavedRender/UnsavedRenderBoundary.js";
import { useUnsavedRender } from "./unsavedRender/useUnsavedRender.js";

type RenderedByAction = { action: LiveRichTextAction; render?: never };

type RenderedByCall = { action?: never; render: LiveRichTextRender };

export type LiveRichTextProps = LiveRichTextIdentity &
  (RenderedByAction | RenderedByCall) & { children: ReactNode };

function LiveRichTextOfField({ action, children, field, render, shape }: LiveRichTextProps) {
  const renderUnsaved: LiveRichTextRender = render ?? ((request) => action(request));
  const { dropUnsavedRender, shown } = useUnsavedRender(
    field,
    { node: children, shape },
    renderUnsaved
  );

  return (
    <UnsavedRenderBoundary fallback={children} onError={dropUnsavedRender}>
      {shown}
    </UnsavedRenderBoundary>
  );
}

export function LiveRichText(props: LiveRichTextProps): ReactNode {
  const locale = useContext(OverlayScopeContext)?.locale;
  return (
    <Fragment key={locale}>
      <LiveRichTextOfField key={keyedFieldAddressOf(props.field)} {...props} />
    </Fragment>
  );
}
