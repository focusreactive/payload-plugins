import type { RefObject } from "react";

import { useStrikethroughAnimation } from "./useStrikethroughAnimation";

interface Props {
  isResolved: boolean;
  contentRef: RefObject<HTMLElement | null>;
}

export function StrikethoroughOverlay({ isResolved, contentRef }: Props) {
  const { lineRects, lineContentRect, getLineByIndexRef } =
    useStrikethroughAnimation(isResolved, contentRef);

  if (!lineRects.length || !lineContentRect) {return null;}

  const lineHeight = lineContentRect.height / lineRects.length;

  return (
    <span
      className="block absolute inset-0 pointer-events-none"
      aria-hidden="true"
    >
      {lineRects.map((rect, i) => (
        <span
          key={`line-${i}`}
          className="absolute h-px bg-current"
          ref={getLineByIndexRef(i)}
          style={{
            left: rect.left - lineContentRect.left,
            top: Math.round(lineHeight * i + lineHeight / 2) - 1,
            width: 0,
          }}
        />
      ))}
    </span>
  );
}
