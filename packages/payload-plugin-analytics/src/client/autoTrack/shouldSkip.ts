export function shouldSkip(target: EventTarget | null) {
  if (!target || !(target instanceof Element)) return false;

  return target.closest("[data-analytics-skip]") !== null;
}
