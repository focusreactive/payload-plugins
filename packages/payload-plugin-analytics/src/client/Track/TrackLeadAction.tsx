"use client";

import type { ReactElement } from "react";
import { Track } from "./index";
import { FR_LEAD_TYPE_PARAM, LEAD_ACTION_EVENT_NAME } from "../../constants/events";
import type { LeadActionType } from "../../types/leadActions";
import type { TrackOn } from "../../types";

export interface TrackLeadActionProps {
  on: TrackOn;
  type: LeadActionType;
  payload?: Record<string, unknown>;
  children: ReactElement | null | undefined;
}

export function TrackLeadAction({ on, type, payload, children }: TrackLeadActionProps) {
  const mergedPayload = { [FR_LEAD_TYPE_PARAM]: type, ...(payload ?? {}) };

  return (
    <Track on={on} event={LEAD_ACTION_EVENT_NAME} payload={mergedPayload}>
      {children}
    </Track>
  );
}
