import { useCommentsDrawer } from "../../../providers/CommentsDrawerProvider";
import { useLayoutEffect } from "react";

export function useScrollToTargetFieldGroup() {
  const { scrollTargetPath, setScrollTargetPath } = useCommentsDrawer();

  useLayoutEffect(() => {
    if (!scrollTargetPath) return;

    const id = setTimeout(() => {
      const section = document.querySelector(`[data-field-path="${CSS.escape(scrollTargetPath)}"]`);
      if (!section) return;

      let scrollContainer: Element | null = section.parentElement;

      while (scrollContainer && scrollContainer !== document.documentElement) {
        const { overflow, overflowY } = getComputedStyle(scrollContainer);
        if (/auto|scroll/.test(overflow + overflowY)) break;
        scrollContainer = scrollContainer.parentElement;
      }

      if (!scrollContainer || scrollContainer === document.documentElement) {
        section.scrollIntoView({ behavior: "smooth", block: "start" });
        setScrollTargetPath(null);
        return;
      }

      const header = scrollContainer.querySelector("header");
      const headerHeight = header?.getBoundingClientRect().height ?? 0;

      const sectionTop = section.getBoundingClientRect().top;
      const containerTop = scrollContainer.getBoundingClientRect().top;
      const scrollOffset = sectionTop - containerTop - headerHeight + scrollContainer.scrollTop;

      scrollContainer.scrollTo({ top: scrollOffset, behavior: "smooth" });
      setScrollTargetPath(null);
    }, 300);

    return () => clearTimeout(id);
  }, [scrollTargetPath, setScrollTargetPath]);
}
