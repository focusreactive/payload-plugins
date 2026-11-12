export const waitFor = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export const flushMutations = () => waitFor(0);
