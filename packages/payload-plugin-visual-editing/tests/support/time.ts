import { STRUCTURE_SETTLE_MS } from "../../src/client/instantPreview/unsavedRender/unsavedRender";

export const waitFor = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export const flushMutations = () => waitFor(0);

export const settleStructure = () => waitFor(STRUCTURE_SETTLE_MS);
