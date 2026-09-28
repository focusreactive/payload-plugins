const POLL_MS = 50;
const POLL_TRIES = 120;
const FLASH_MS = 1500;
const ACCENT = "#3b82f6";
const SCROLL_MARGIN = "120px";
const SCROLL_MS = 600;
const STABLE_CHECKS = 2;
const STABLE_CHECKS_AFTER_OPENING = 6;

// Offset inside the form, which scrolling does not change and a row growing above does.
const offset = (el: Element) =>
  el.getBoundingClientRect().top -
  (el.closest("form") ?? document.body).getBoundingClientRect().top;

// Rows above the target are still opening when it is found, and each one pushes it down.
const settle = async (el: Element, checks: number) => {
  let last = offset(el);
  for (let attempt = 0, stable = 0; attempt < POLL_TRIES && stable < checks; attempt += 1) {
    await new Promise((resolve) => setTimeout(resolve, POLL_MS));
    const now = offset(el);
    stable = now === last ? stable + 1 : 0;
    last = now;
  }
};

// One smooth scroll once the form has stopped moving, and one more if something moved it after.
export const revealRow = async (target: Element, opened: boolean) => {
  const el = target as HTMLElement;
  el.style.scrollMarginTop = SCROLL_MARGIN;
  await settle(el, opened ? STABLE_CHECKS_AFTER_OPENING : STABLE_CHECKS);

  const before = offset(el);
  el.scrollIntoView({ behavior: "smooth", block: "start" });
  el.animate(
    [
      { outlineStyle: "solid", outlineWidth: "2px", outlineOffset: "4px", outlineColor: ACCENT },
      {
        outlineStyle: "solid",
        outlineWidth: "2px",
        outlineOffset: "4px",
        outlineColor: "transparent",
      },
    ],
    { duration: FLASH_MS, easing: "ease-in" }
  );

  await new Promise((resolve) => setTimeout(resolve, SCROLL_MS));
  if (offset(el) !== before) el.scrollIntoView({ behavior: "smooth", block: "start" });
};
