let lastOperationStart = 0;

export function stampOperationStart(): string {
  lastOperationStart = Math.max(Date.now(), lastOperationStart + 1);
  return new Date(lastOperationStart).toISOString();
}
