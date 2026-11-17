"use client";

import type { ReactNode } from "react";

import { Fragment, useContext } from "react";

import type { LiveRichTextIdentity } from "./liveRichTextOf.js";
import type {
  LiveRichTextAction,
  LiveRichTextRender,
  LiveRichTextRenderValue,
} from "./unsavedRender/useUnsavedRender.js";

import { keyedFieldAddressOf } from "../../shared/veDocument.js";
import { OverlayScopeContext } from "../overlayContext.js";
import { UnsavedRenderBoundary } from "./unsavedRender/UnsavedRenderBoundary.js";
import { useUnsavedRender } from "./unsavedRender/useUnsavedRender.js";

type RenderedByAction = { action: LiveRichTextAction; render?: never };

type RenderedByCall = { action?: never; render: LiveRichTextRender };

export type LiveRichTextProps<Value = unknown> = LiveRichTextIdentity &
  (RenderedByAction | RenderedByCall) & {
    children: ReactNode;
    renderValue?: LiveRichTextRenderValue<Value>;
  };

function LiveRichTextOfField({
  action,
  children,
  render,
  renderValue,
  ...identity
}: LiveRichTextProps) {
  const renderUnsaved: LiveRichTextRender = render ?? ((request) => action(request));
  const { dropUnsavedRender, shown } = useUnsavedRender(
    identity,
    { node: children, shape: identity.shape },
    { render: renderUnsaved, renderValue }
  );

  return (
    <UnsavedRenderBoundary fallback={children} onError={dropUnsavedRender}>
      {shown}
    </UnsavedRenderBoundary>
  );
}

export function LiveRichText<Value = unknown>(props: LiveRichTextProps<Value>): ReactNode {
  const locale = useContext(OverlayScopeContext)?.locale;
  return (
    <Fragment key={locale}>
      <LiveRichTextOfField
        key={keyedFieldAddressOf(props.field)}
        {...(props as LiveRichTextProps)}
      />
    </Fragment>
  );
}
