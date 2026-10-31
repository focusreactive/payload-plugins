import type { Locator, Page } from "@playwright/test";

/** Where on the row the pointer stops: the top, the middle or the bottom of it. */
export type DragZone = "after" | "before" | "inside";

// Inside the zones of spec section 7.3 for both kinds of row: a folder is before below 25 percent
// and after above 75, a page splits at 50.
const zoneHeightFraction: Record<DragZone, number> = { after: 0.9, before: 0.1, inside: 0.5 };

const boxOf = async (row: Locator) => {
  await row.scrollIntoViewIfNeeded();
  const box = await row.boundingBox();
  if (!box) {
    throw new Error("The row has no box on screen");
  }

  return box;
};

/**
 * Presses the mouse on a row and moves a little, past the five pixels it takes to start a drag.
 * The press lands on the row's name block, away from the checkbox and the chevron.
 */
export const startDrag = async (page: Page, source: Locator): Promise<void> => {
  const box = await boxOf(source);
  const x = box.x + box.width * 0.6;
  const y = box.y + box.height / 2;
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x + 12, y + 12, { steps: 4 });
};

/**
 * Presses the mouse on the middle of an element, which may be the row's name, its checkbox or its
 * chevron, and moves well past the five pixels a drag takes. Returns where it pressed.
 */
export const pressAndPull = async (
  page: Page,
  element: Locator
): Promise<{ x: number; y: number }> => {
  const box = await boxOf(element);
  const x = box.x + box.width / 2;
  const y = box.y + box.height / 2;
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x + 14, y + 14, { steps: 4 });

  return { x, y };
};

/** Moves a pressed mouse onto a zone of another row, in steps like a hand. */
export const moveOver = async (
  page: Page,
  target: Locator,
  zone: DragZone,
  steps = 12
): Promise<void> => {
  const box = await boxOf(target);
  await page.mouse.move(box.x + box.width * 0.6, box.y + box.height * zoneHeightFraction[zone], {
    steps,
  });
};

/** A whole drag: press on the source, move onto a zone of the target, release. */
export const dragRowTo = async (
  page: Page,
  source: Locator,
  target: Locator,
  zone: DragZone
): Promise<void> => {
  await startDrag(page, source);
  await moveOver(page, target, zone);
  await page.mouse.up();
};

/** The rows of a folder as the tree shows them: title, in screen order, for the rows named. */
export const rowTitlesIn = (page: Page, titles: readonly string[]): Promise<string[]> =>
  page
    .getByTestId("tree-row")
    .evaluateAll(
      (rows, wanted) =>
        rows
          .map((row) => row.getAttribute("data-title") ?? "")
          .filter((title) => wanted.includes(title)),
      [...titles]
    );
