"use client";

import { useEffect } from "react";
import { useStepNav } from "@payloadcms/ui";

interface Props {
  label: string;
}

export default function SetAnalyticsStepNav({ label }: Props) {
  const { setStepNav } = useStepNav();

  useEffect(() => {
    setStepNav([{ label }]);
  }, [setStepNav, label]);

  return null;
}
