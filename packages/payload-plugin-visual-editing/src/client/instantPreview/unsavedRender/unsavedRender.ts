import type { VeEditorState } from "../../../shared/protocol.js";

export type RenderOfShape<Node> = { node: Node; shape: string };

type ToldStructure = {
  locale?: string;
  shape: string;
  state: VeEditorState | null;
};

export type UnsavedStructure = ToldStructure & { state: VeEditorState };

export type UnsavedRenderState<Node> = {
  editorShape: string | null;
  isAwaitingRender: boolean;
  settledCall: object | null;
  unsaved: RenderOfShape<Node> | null;
};

export type UnsavedRenderOptions<Node> = {
  render: (structure: UnsavedStructure, signal: AbortSignal) => Promise<Node | null | undefined>;
  shown: UnsavedRenderState<Node>;
  savedShape: string;
  onChange: (change: Partial<UnsavedRenderState<Node>>, isRender: boolean) => void;
};

export interface UnsavedRender<Node> {
  tell(structure: ToldStructure): void;
  committed(shown: UnsavedRenderState<Node>, savedShape: string): void;
  dropUnsaved(): void;
  stop(): void;
}

export const RENDER_TIMEOUT_MS = 10_000;
export const RETRY_AFTER_MS = 1000;
export const MOST_RETRIES_OF_A_STRUCTURE = 5;
export const COMMIT_WAIT_MS = 1000;

export const NOTHING_TOLD: UnsavedRenderState<never> = {
  editorShape: null,
  isAwaitingRender: false,
  settledCall: null,
  unsaved: null,
};

export const heldSavedOf = <Node>(
  held: RenderOfShape<Node>,
  saved: RenderOfShape<Node>,
  editorShape: string | null
): RenderOfShape<Node> => {
  const isEditorOnSaved = editorShape === null || editorShape === saved.shape;
  const isHeld = held.node === saved.node && held.shape === saved.shape;
  return isEditorOnSaved && !isHeld ? saved : held;
};

export const inPlaceOfSaved = <Node>(
  { editorShape, isAwaitingRender, unsaved }: UnsavedRenderState<Node>,
  saved: RenderOfShape<Node>,
  heldSaved: RenderOfShape<Node>
): Node => {
  if (saved.shape === editorShape) return saved.node;
  if (unsaved?.shape === editorShape) return unsaved.node;
  if (isAwaitingRender && heldSaved.shape === editorShape) return heldSaved.node;
  return unsaved && unsaved.shape !== saved.shape ? unsaved.node : saved.node;
};

type Call = { abort: AbortController; isAbandoned: boolean };

const abandon = (call: Call) => {
  call.isAbandoned = true;
  call.abort.abort();
};

export function createUnsavedRender<Node>({
  onChange,
  render,
  savedShape,
  shown,
}: UnsavedRenderOptions<Node>): UnsavedRender<Node> {
  let committed = { savedShape, shown };
  let waiting: UnsavedStructure | null = null;
  let unsettled: Call | null = null;
  let isStopped = false;
  let retryTimer: ReturnType<typeof setTimeout> | undefined;
  let retryAfterMs = RETRY_AFTER_MS;
  let retriesLeft = MOST_RETRIES_OF_A_STRUCTURE;
  let awaitedCommit: { continueWithNextCall: () => void; settledCall: object } | null = null;

  const change = (next: Partial<UnsavedRenderState<Node>>, isRender = false) =>
    onChange(next, isRender);

  const showsEditorShape = () =>
    committed.shown.editorShape === committed.savedShape ||
    committed.shown.editorShape === committed.shown.unsaved?.shape;

  const showAfterCommit = (next: Partial<UnsavedRenderState<Node>>) =>
    new Promise<void>((resolve) => {
      const settledCall = {};
      awaitedCommit = { continueWithNextCall: resolve, settledCall };
      setTimeout(resolve, COMMIT_WAIT_MS);
      change({ ...next, settledCall }, true);
    });

  const settle = (shape: string, node: Node | null, isAnotherWaiting: boolean) => {
    if (shape !== committed.shown.editorShape && showsEditorShape()) {
      change({ isAwaitingRender: isAnotherWaiting });
      return;
    }
    return showAfterCommit({
      isAwaitingRender: isAnotherWaiting,
      unsaved: node === null ? null : { node, shape },
    });
  };

  const renderedOrNothing = async (structure: UnsavedStructure, signal: AbortSignal) => {
    try {
      return (await render(structure, signal)) ?? null;
    } catch {
      return null;
    }
  };

  const resetRetries = () => {
    retryAfterMs = RETRY_AFTER_MS;
    retriesLeft = MOST_RETRIES_OF_A_STRUCTURE;
  };

  const isWanted = ({ shape }: UnsavedStructure) =>
    shape === committed.shown.editorShape && shape !== committed.savedShape;

  const retryLater = (structure: UnsavedStructure, startCall: () => Promise<void>) => {
    if (retriesLeft === 0) return;
    retriesLeft -= 1;
    retryTimer = setTimeout(() => {
      if (waiting || unsettled || isStopped || !isWanted(structure)) return;
      waiting = structure;
      void startCall();
    }, retryAfterMs);
    retryAfterMs *= 2;
  };

  const renderWaiting = async (): Promise<void> => {
    if (!waiting || isStopped) return;
    const structure = waiting;
    waiting = null;

    const call: Call = { abort: new AbortController(), isAbandoned: false };
    unsettled = call;
    const timer = setTimeout(() => {
      if (call.isAbandoned) return;
      abandon(call);
      void settle(structure.shape, null, waiting !== null);
    }, RENDER_TIMEOUT_MS);
    const node = await renderedOrNothing(structure, call.abort.signal);
    clearTimeout(timer);

    const isRendered = node !== null && !call.isAbandoned;
    if (!call.isAbandoned) await settle(structure.shape, node, waiting !== null);
    unsettled = null;
    if (!isRendered && !waiting) retryLater(structure, renderWaiting);
    await renderWaiting();
  };

  const cancel = () => {
    waiting = null;
    clearTimeout(retryTimer);
    if (unsettled) abandon(unsettled);
  };

  const request = (structure: UnsavedStructure) => {
    waiting = structure;
    clearTimeout(retryTimer);
    resetRetries();
    if (!unsettled) void renderWaiting();
  };

  return {
    committed(committedShown, committedSavedShape) {
      committed = { savedShape: committedSavedShape, shown: committedShown };
      if (!awaitedCommit || awaitedCommit.settledCall !== committedShown.settledCall) return;
      const { continueWithNextCall } = awaitedCommit;
      awaitedCommit = null;
      continueWithNextCall();
    },
    dropUnsaved: () => change({ unsaved: null }),
    stop() {
      isStopped = true;
      cancel();
    },
    tell({ locale, shape, state: editorState }) {
      if (editorState === null) cancel();
      else request({ locale, shape, state: editorState });
      change({
        editorShape: shape,
        isAwaitingRender: editorState !== null,
        ...(editorState === null && { unsaved: null }),
      });
    },
  };
}
