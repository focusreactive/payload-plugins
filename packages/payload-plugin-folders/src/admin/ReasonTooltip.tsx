import { Tooltip } from "@payloadcms/ui";
import { useState } from "react";
import type { ReactNode } from "react";

/**
 * Shows the reason something is off, on hover and on keyboard focus. The reason is also written
 * out for assistive technology, because a tooltip alone is not read to everyone.
 */
export const ReasonTooltip = ({
  children,
  position = "bottom",
  reason,
}: {
  children: ReactNode;
  position?: "bottom" | "top";
  /** `null` when nothing is off: the wrapper then adds nothing. */
  reason: string | null;
}) => {
  const [show, setShow] = useState(false);
  if (reason === null) {
    return <>{children}</>;
  }

  return (
    <span
      className="fr-folders-reason"
      onBlur={() => setShow(false)}
      onFocus={() => setShow(true)}
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
    >
      {children}
      <Tooltip position={position} show={show}>
        {reason}
      </Tooltip>
    </span>
  );
};
