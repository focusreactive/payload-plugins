let active: string[] = [];

export function setActiveExistingRefs(refs: string[]): void {
  active = refs;
}

export function getActiveExistingRefs(): string[] {
  return active;
}

export function __clearActiveExistingRefs(): void {
  active = [];
}
