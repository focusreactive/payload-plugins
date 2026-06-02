"use client";

import type { ReactElement, Ref } from "react";
import { cloneElement, useEffect, useRef } from "react";
import type { AnalyticsProvider } from "../../types/provider";

interface ViewTrackerProps {
  event: string;
  payload?: Record<string, unknown>;
  provider: AnalyticsProvider;
  children: ReactElement;
}

type RefLike<T> = Ref<T> | undefined | null;

function setRef<T>(ref: RefLike<T>, value: T | null): void {
  if (typeof ref === "function") {
    ref(value);
  } else if (ref && typeof ref === "object") {
    (ref as { current: T | null }).current = value;
  }
}

export function ViewTracker({ event, payload, provider, children }: ViewTrackerProps) {
  const elementRef = useRef<Element | null>(null);
  const fired = useRef(false);

  useEffect(() => {
    const node = elementRef.current;

    if (!node) return;
    if (typeof IntersectionObserver === "undefined") return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!fired.current && entry.intersectionRatio >= 0.5) {
            fired.current = true;
            provider.trackEvent(event, payload);
            observer.disconnect();

            break;
          }
        }
      },
      { threshold: 0.5 }
    );

    observer.observe(node);

    return () => observer.disconnect();
  }, [event, payload, provider]);

  const childRef = (children as unknown as { ref?: RefLike<Element> }).ref;
  const mergedRef = (node: Element | null) => {
    elementRef.current = node;

    setRef(childRef, node);
  };

  return cloneElement(children, { ref: mergedRef } as unknown as Partial<unknown>);
}
