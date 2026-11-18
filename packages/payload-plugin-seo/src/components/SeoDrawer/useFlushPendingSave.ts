"use client";

import { useEffect } from "react";
import type { RemoteSaver } from "./remoteSaver";

export function useFlushPendingSave(saver: RemoteSaver | null): void {
  useEffect(() => {
    if (!saver) return;

    const flush = () => void saver.flush();
    const flushWhenHidden = () => {
      if (document.visibilityState === "hidden") flush();
    };

    window.addEventListener("pagehide", flush);
    window.addEventListener("online", flush);
    document.addEventListener("visibilitychange", flushWhenHidden);

    return () => {
      window.removeEventListener("pagehide", flush);
      window.removeEventListener("online", flush);
      document.removeEventListener("visibilitychange", flushWhenHidden);
      flush();
    };
  }, [saver]);
}
