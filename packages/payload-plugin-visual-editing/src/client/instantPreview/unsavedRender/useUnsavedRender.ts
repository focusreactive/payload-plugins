import type { ReactNode } from "react";

import { startTransition, useContext, useRef, useState } from "react";

import type { LiveRichTextRequest } from "../../../shared/protocol.js";
import type { LiveRichTextIdentity } from "../liveRichTextOf.js";
import type { LiveRichText } from "./liveRichText.js";
import type { RenderedOnThePage } from "./renderValue.js";
import type { RenderOfShape, UnsavedRenderState } from "./unsavedRender.js";

import { OverlayScopeContext } from "../../overlayContext.js";
import { startLiveRichText } from "../../overlayScope.js";
import { useIsomorphicLayoutEffect } from "../../useIsomorphicLayoutEffect.js";
import { usePayloadValues, useVisualEditing } from "../../VisualEditingProvider.js";
import { shownWithoutLiveRichText } from "./liveRichText.js";
import { renderedOnThePage, renderedThroughPayload } from "./renderValue.js";
import { NOTHING_TOLD } from "./unsavedRender.js";

export type LiveRichTextRender = (
  request: LiveRichTextRequest,
  signal: AbortSignal
) => Promise<ReactNode>;

export type LiveRichTextAction = (request: LiveRichTextRequest) => Promise<ReactNode>;

export type LiveRichTextRenderValue<Value = unknown> = (value: Value) => ReactNode;

export type UnsavedRenders = {
  render: LiveRichTextRender;
  renderValue?: LiveRichTextRenderValue;
};

export type UnsavedRenderOfField = {
  dropUnsavedRender: () => void;
  shown: ReactNode;
};

export function useUnsavedRender(
  identity: LiveRichTextIdentity,
  saved: RenderOfShape<ReactNode>,
  { render, renderValue }: UnsavedRenders
): UnsavedRenderOfField {
  const { adminOrigin, available, instantPreview } = useVisualEditing();
  const payloadValues = usePayloadValues();
  const scope = useContext(OverlayScopeContext);
  const isLive = available && instantPreview;
  const isRenderedOnThePage = renderValue !== undefined;
  const [state, setState] = useState<UnsavedRenderState<ReactNode>>(NOTHING_TOLD);
  const live = useRef<LiveRichText<ReactNode> | null>(null);
  const onThePage = useRef<RenderedOnThePage<ReactNode> | null>(null);
  const latest = useRef({
    adminOrigin,
    identity,
    payloadValues,
    render,
    renderValue,
    savedShape: saved.shape,
    state,
  });

  useIsomorphicLayoutEffect(() => {
    latest.current = {
      adminOrigin,
      identity,
      payloadValues,
      render,
      renderValue,
      savedShape: saved.shape,
      state,
    };
  });

  const liveRichText = isLive ? live.current : null;
  const shownNow = liveRichText
    ? liveRichText.shownFor(state, saved)
    : shownWithoutLiveRichText(saved);

  useIsomorphicLayoutEffect(() => {
    shownNow.commit();
  });

  const renderValueNow = (value: unknown) => latest.current.renderValue?.(value);

  const renderUnsaved: LiveRichTextRender = (request, signal) => {
    const { payloadValues: values, render: renderCall } = latest.current;
    if (!latest.current.renderValue || !values?.source.canAsk()) {
      return renderCall(request, signal);
    }
    return renderedThroughPayload({ ...values, renderValue: renderValueNow })(request, signal);
  };

  const bases = payloadValues?.bases ?? null;

  useIsomorphicLayoutEffect(() => {
    if (!isLive || !isRenderedOnThePage) return;
    const rendered = renderedOnThePage(latest.current.identity, bases, renderValueNow, () =>
      live.current?.renderOnThePageAgain()
    );
    onThePage.current = rendered;
    return () => {
      onThePage.current = null;
      rendered?.stop();
    };
  }, [isLive, isRenderedOnThePage, bases, identity.hasReferences]);

  useIsomorphicLayoutEffect(() => {
    if (!isLive) return;
    const created = startLiveRichText<ReactNode>(scope, {
      adminOrigin: () => latest.current.adminOrigin,
      field: latest.current.identity.field,
      onChange: (nextState, isRender) => {
        const show = () => setState(nextState);
        if (isRender) startTransition(show);
        else show();
      },
      optimistic: (request) => onThePage.current?.optimistic(request) ?? null,
      render: renderUnsaved,
      savedShape: latest.current.savedShape,
      shown: latest.current.state,
    });
    live.current = created;

    return () => {
      live.current = null;
      created.stop();
    };
  }, [isLive, scope]);

  return {
    dropUnsavedRender: () => live.current?.dropUnsaved(),
    shown: shownNow.node,
  };
}
