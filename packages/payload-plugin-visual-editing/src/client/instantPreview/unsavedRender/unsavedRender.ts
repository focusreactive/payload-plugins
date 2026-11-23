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

export type RenderOnThePage<Node> = (
  structure: UnsavedStructure
) => Node | null | PromiseLike<Node | null>;

export type UnsavedRenderOptions<Node> = {
  render: (structure: UnsavedStructure, signal: AbortSignal) => Promise<Node | null | undefined>;
  optimistic?: RenderOnThePage<Node>;
  shown: UnsavedRenderState<Node>;
  savedShape: string;
  onChange: (change: Partial<UnsavedRenderState<Node>>, isRender: boolean) => void;
};

export interface UnsavedRender<Node> {
  tell(structure: ToldStructure): void;
  committed(shown: UnsavedRenderState<Node>, savedShape: string): void;
  renderOnThePageAgain(): void;
  dropUnsaved(): void;
  stop(): void;
}

export const RENDER_TIMEOUT_MS = 10_000;
export const RETRY_AFTER_MS = 1000;
export const MOST_RETRIES_OF_A_STRUCTURE = 5;
export const COMMIT_WAIT_MS = 1000;
export const STRUCTURE_SETTLE_MS = 200;
export const SERVER_CHECK_PAUSE_MS = 350;

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

const nodeOrNothing = async <Node>(rendering: PromiseLike<Node | null>): Promise<Node | null> => {
  try {
    return await rendering;
  } catch {
    return null;
  }
};

const isPromiseLike = <Value>(value: unknown): value is PromiseLike<Value> =>
  typeof (value as PromiseLike<Value> | null)?.then === "function";

const abandon = (call: Call) => {
  call.isAbandoned = true;
  call.abort.abort();
};

export function createUnsavedRender<Node>({
  onChange,
  optimistic,
  render,
  savedShape,
  shown,
}: UnsavedRenderOptions<Node>): UnsavedRender<Node> {
  let committed = { savedShape, shown };
  let waiting: UnsavedStructure | null = null;
  let unsettled: Call | null = null;
  let isStopped = false;
  let retryTimer: ReturnType<typeof setTimeout> | undefined;
  let startTimer: ReturnType<typeof setTimeout> | undefined;
  let toldShape: string | null = null;
  let toldUnsaved: UnsavedStructure | null = null;
  let shownOnThePage: RenderOfShape<Node> | null = null;
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

  const renderedOnThePageAs = (shape: string) =>
    shownOnThePage?.shape === shape ? shownOnThePage : null;

  const settle = (shape: string, node: Node | null, isAnotherWaiting: boolean) => {
    if (shape !== committed.shown.editorShape && showsEditorShape()) {
      change({ isAwaitingRender: isAnotherWaiting });
      return;
    }
    return showAfterCommit({
      isAwaitingRender: isAnotherWaiting,
      unsaved: node === null ? renderedOnThePageAs(shape) : { node, shape },
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
    if (startTimer === undefined) await renderWaiting();
  };

  const cancel = () => {
    waiting = null;
    clearTimeout(retryTimer);
    clearTimeout(startTimer);
    startTimer = undefined;
    if (unsettled) abandon(unsettled);
  };

  const startAfter = (delayMs: number) => {
    startTimer = setTimeout(() => {
      startTimer = undefined;
      if (!unsettled) void renderWaiting();
    }, delayMs);
  };

  const wait = (structure: UnsavedStructure) => {
    waiting = structure;
    clearTimeout(retryTimer);
    resetRetries();
  };

  const request = (structure: UnsavedStructure) => {
    wait(structure);
    if (unsettled || startTimer !== undefined) return;
    startAfter(STRUCTURE_SETTLE_MS);
  };

  const checkAfterPause = (structure: UnsavedStructure) => {
    wait(structure);
    clearTimeout(startTimer);
    startAfter(SERVER_CHECK_PAUSE_MS);
  };

  const renderedOnThePage = (structure: UnsavedStructure) => {
    try {
      return optimistic?.(structure) ?? null;
    } catch {
      return null;
    }
  };

  const showWhenRendered = async (shape: string, rendering: PromiseLike<Node | null>) => {
    const node = await nodeOrNothing(rendering);
    if (node === null || isStopped || toldShape !== shape) return;
    shownOnThePage = { node, shape };
    change({ unsaved: shownOnThePage });
  };

  const isRenderedAs = (shape: string) =>
    shownOnThePage?.shape === shape || committed.shown.unsaved?.shape === shape;

  const tellUnsaved = (structure: UnsavedStructure) => {
    const { shape } = structure;
    toldUnsaved = structure;
    const rendered = renderedOnThePage(structure);
    if (rendered === null || isPromiseLike<Node | null>(rendered)) {
      request(structure);
      change({ editorShape: shape, isAwaitingRender: true });
      if (rendered !== null) void showWhenRendered(shape, rendered);
      return;
    }
    checkAfterPause(structure);
    shownOnThePage = { node: rendered, shape };
    change({ editorShape: shape, isAwaitingRender: true, unsaved: shownOnThePage });
  };

  return {
    committed(committedShown, committedSavedShape) {
      committed = { savedShape: committedSavedShape, shown: committedShown };
      if (!awaitedCommit || awaitedCommit.settledCall !== committedShown.settledCall) return;
      const { continueWithNextCall } = awaitedCommit;
      awaitedCommit = null;
      continueWithNextCall();
    },
    renderOnThePageAgain() {
      const structure = toldUnsaved;
      if (!structure || isStopped || isRenderedAs(structure.shape)) return;
      const rendered = renderedOnThePage(structure);
      if (rendered === null) return;
      if (isPromiseLike<Node | null>(rendered)) {
        void showWhenRendered(structure.shape, rendered);
        return;
      }
      shownOnThePage = { node: rendered, shape: structure.shape };
      change({ unsaved: shownOnThePage });
    },
    dropUnsaved() {
      shownOnThePage = null;
      change({ unsaved: null });
    },
    stop() {
      isStopped = true;
      cancel();
    },
    tell({ locale, shape, state: editorState }) {
      toldShape = shape;
      if (editorState !== null) {
        tellUnsaved({ locale, shape, state: editorState });
        return;
      }
      cancel();
      toldUnsaved = null;
      shownOnThePage = null;
      change({ editorShape: shape, isAwaitingRender: false, unsaved: null });
    },
  };
}
