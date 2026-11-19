"use client";

import { useEffect } from "react";
import type { RefObject } from "react";

import { MODE_ATTRIBUTE, OWNER_ATTRIBUTE } from "../lib/constants.js";
import type { DefaultMode } from "../lib/headerClick.js";

export const useOwnFormMarker = (
  markerRef: RefObject<HTMLElement | null>,
  ownerId: string,
  mode: DefaultMode
) => {
  useEffect(() => {
    const form = markerRef.current?.closest("form");
    form?.setAttribute(OWNER_ATTRIBUTE, ownerId);
    form?.setAttribute(MODE_ATTRIBUTE, mode);
    return () => {
      form?.removeAttribute(OWNER_ATTRIBUTE);
      form?.removeAttribute(MODE_ATTRIBUTE);
    };
  }, [markerRef, mode, ownerId]);
};
