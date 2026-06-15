"use client";

import type { MouseEvent, FormEvent, ReactElement } from "react";
import { Children, cloneElement, isValidElement } from "react";
import { useAnalyticsProvider } from "../hooks/useAnalytics";
import type { TrackProps } from "../../types";
import { mergeHandler } from "./mergeHandler";
import { ViewTracker } from "./ViewTracker";

interface ChildProps {
  onClick?: (e: MouseEvent) => void;
  onSubmit?: (e: FormEvent) => void;
  onMouseEnter?: (e: MouseEvent) => void;
  "data-analytics-skip"?: string;
}

export function Track({ on, event, payload, children }: TrackProps) {
  const provider = useAnalyticsProvider();

  let child: ReactElement<ChildProps> | null | undefined = null;

  if (isValidElement(children)) {
    child = children as ReactElement<ChildProps>;
  } else {
    const elements = Children.toArray(children).filter(isValidElement) as ReactElement<ChildProps>[];
    if (elements.length === 1) {
      child = elements[0];
    } else if (elements.length > 1) {
      if (process.env.NODE_ENV !== "production") {
        console.warn("<Track> expects a single React element child; received multiple. Rendering children untouched without tracking.");
      }
      return <>{children}</>;
    }
  }

  if (child == null) return null;

  const fire = () => provider.trackEvent(event, payload);

  if (on === "view") {
    return (
      <ViewTracker event={event} payload={payload} provider={provider}>
        {cloneElement(child, { "data-analytics-skip": "1" })}
      </ViewTracker>
    );
  }

  const childProps = child.props;
  const overrides: Partial<ChildProps> = { "data-analytics-skip": "1" };

  if (on === "click") {
    overrides.onClick = mergeHandler<MouseEvent>(childProps.onClick, fire);
  } else if (on === "submit") {
    overrides.onSubmit = mergeHandler<FormEvent>(childProps.onSubmit, fire);
  } else if (on === "hover") {
    overrides.onMouseEnter = mergeHandler<MouseEvent>(childProps.onMouseEnter, fire);
  }

  return cloneElement(child, overrides);
}
