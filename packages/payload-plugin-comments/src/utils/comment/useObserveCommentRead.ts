"use client";

import { useEffect } from "react";
import type { RefObject } from "react";
import { READ_DWELL_MS, READ_OBSERVER_THRESHOLD } from "../../constants";
import { useMarkCommentReadMutation } from "../../api/mutations/useMarkCommentReadMutation";

interface Params {
  ref: RefObject<HTMLElement | null>;
  commentId: number;
  enabled: boolean;
}

export function useObserveCommentRead({ ref, commentId, enabled }: Params) {
  const { mutate } = useMarkCommentReadMutation();

  useEffect(() => {
    if (!enabled) return;

    const node = ref.current;
    if (!node) return;

    if (typeof IntersectionObserver === "undefined") {
      mutate({ commentId });
      return;
    }

    let timer: ReturnType<typeof setTimeout> | null = null;
    let fired = false;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (fired) return;

          if (entry.isIntersecting && entry.intersectionRatio >= READ_OBSERVER_THRESHOLD) {
            if (timer == null) {
              timer = setTimeout(() => {
                fired = true;
                mutate({ commentId });
                observer.disconnect();
                timer = null;
              }, READ_DWELL_MS);
            }
          } else if (timer != null) {
            clearTimeout(timer);
            timer = null;
          }
        }
      },
      { threshold: [READ_OBSERVER_THRESHOLD] }
    );

    observer.observe(node);

    return () => {
      if (timer != null) clearTimeout(timer);
      observer.disconnect();
    };
  }, [enabled, commentId, mutate, ref]);
}
