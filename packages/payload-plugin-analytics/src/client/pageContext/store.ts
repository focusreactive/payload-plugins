export interface PageContext {
  pageRef: string;
  locale: string;
}

let current: PageContext | null = null;

export function setPageContext(ctx: PageContext): void {
  current = ctx;
}

export function getPageContext(): PageContext | null {
  return current;
}

export function clearPageContext(): void {
  current = null;
}
