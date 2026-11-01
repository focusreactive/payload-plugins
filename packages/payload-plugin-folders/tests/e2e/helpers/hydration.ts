import { expect } from "@playwright/test";
import type { Locator } from "@playwright/test";

/**
 * Waits until React has taken over the element: a click or a key sent to a server-rendered field
 * before that is dropped, with no error, and on a slow machine the page's load event comes well
 * before the fields are live. React marks every DOM node it controls with a `__reactProps$` key.
 */
export const waitUntilHydrated = async (element: Locator): Promise<void> => {
  await expect
    .poll(
      () =>
        element.evaluate((node) =>
          Object.keys(node).some((key) => key.startsWith("__reactProps$"))
        ),
      { message: "React has not taken over the element yet", timeout: 60_000 }
    )
    .toBe(true);
};
