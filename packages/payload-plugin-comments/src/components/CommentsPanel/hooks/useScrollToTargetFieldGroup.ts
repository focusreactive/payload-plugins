import { useLayoutEffect } from "react";

import { DRAWER_OPENING_TIME } from "../../../constants";
import { useCommentsDrawer } from "../../../providers/CommentsDrawerProvider";

export function useScrollToTargetFieldGroup() {
  const { scrollTargetPath, setScrollTargetPath } = useCommentsDrawer();

  useLayoutEffect(() => {
    if (!scrollTargetPath) {return;}

    const id = setTimeout(() => {
      const section = document.querySelector(
        `[data-field-path="${CSS.escape(scrollTargetPath)}"]`
      );
      if (!section) {return;}

      let scrollContainer: Element | null = section.parentElement;

      while (scrollContainer && scrollContainer !== document.documentElement) {
        const { overflow, overflowY } = getComputedStyle(scrollContainer);
        if (/auto|scroll/.test(overflow + overflowY)) {break;}
        scrollContainer = scrollContainer.parentElement;
      }

      if (!scrollContainer || scrollContainer === document.documentElement) {
        section.scrollIntoView({ behavior: "smooth", block: "end" });
        setScrollTargetPath(null);
        return;
      }

      const sectionBottom = section.getBoundingClientRect().bottom;
      const containerBottom = scrollContainer.getBoundingClientRect().bottom;
      const scrollOffset =
        scrollContainer.scrollTop + (sectionBottom - containerBottom) + 10;

      scrollContainer.scrollTo({ behavior: "smooth", top: scrollOffset });
      setScrollTargetPath(null);
    }, DRAWER_OPENING_TIME + 10);

    return () => clearTimeout(id);
  }, [scrollTargetPath, setScrollTargetPath]);
}
