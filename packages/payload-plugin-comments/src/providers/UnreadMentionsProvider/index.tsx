"use client";

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";

interface UnreadMentionsContextValue {
  markedReadIds: ReadonlySet<number>;
  isMarkedRead: (commentId: number) => boolean;
  rememberRead: (commentId: number) => void;
}

const UnreadMentionsContext = createContext<UnreadMentionsContextValue | null>(null);

interface Props {
  children: ReactNode;
}

export function UnreadMentionsProvider({ children }: Props) {
  const [markedReadIds, setMarkedReadIds] = useState<ReadonlySet<number>>(() => new Set<number>());

  const isMarkedRead = useCallback((commentId: number) => markedReadIds.has(commentId), [markedReadIds]);

  const rememberRead = useCallback((commentId: number) => {
    setMarkedReadIds((prev) => {
      if (prev.has(commentId)) return prev;

      const next = new Set(prev);
      next.add(commentId);

      return next;
    });
  }, []);

  const value = useMemo(
    () => ({ markedReadIds, isMarkedRead, rememberRead }),
    [markedReadIds, isMarkedRead, rememberRead],
  );

  return <UnreadMentionsContext.Provider value={value}>{children}</UnreadMentionsContext.Provider>;
}

export function useUnreadMentions() {
  const ctx = useContext(UnreadMentionsContext);

  if (!ctx) throw new Error("useUnreadMentions must be used within UnreadMentionsProvider");

  return ctx;
}
