"use client";

import { useContext, useEffect, useMemo, useRef, useState } from "react";

import type { OverlayScope } from "../overlayScope.js";
import type { FollowingSession } from "../sessionOverlay.js";

import { OverlayScopeContext } from "./overlayContext.js";
import { savedShapesWithin } from "../overlayScope.js";
import { startSessionOverlay } from "../sessionOverlay.js";
import { useIsomorphicLayoutEffect } from "./useIsomorphicLayoutEffect.js";
import { useVisualEditing } from "./VisualEditingProvider.js";

export function VisualEditingOverlay({
  locale,
  children,
}: {
  locale?: string;
  children: React.ReactNode;
}) {
  const session = useVisualEditing();
  const rootRef = useRef<HTMLDivElement | null>(null);
  const outerScope = useContext(OverlayScopeContext);
  const [savedShapes] = useState(() => savedShapesWithin(outerScope));
  const scope = useMemo((): OverlayScope => ({ locale, savedShapes }), [locale, savedShapes]);
  const latest = useRef({ scope, session });
  const overlay = useRef<FollowingSession | null>(null);

  useIsomorphicLayoutEffect(() => {
    latest.current = { scope, session };
  });

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const started = startSessionOverlay(
      root,
      () => latest.current.scope,
      () => latest.current.session
    );
    overlay.current = started;
    return () => {
      overlay.current = null;
      started.dispose();
    };
  }, []);

  useEffect(() => {
    overlay.current?.sync();
  }, [session]);

  return (
    <OverlayScopeContext.Provider value={scope}>
      <div ref={rootRef} data-ve-root="" style={{ display: "contents" }}>
        {children}
      </div>
    </OverlayScopeContext.Provider>
  );
}
