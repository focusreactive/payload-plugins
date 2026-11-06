"use client";

import { Button } from "@payloadcms/ui";
import { Gauge } from "lucide-react";
import type { ReactNode } from "react";

interface SeoTriggerButtonProps {
  onClick?: () => void;
  loading?: boolean;
  children?: ReactNode;
}

export function SeoTriggerButton({ onClick, loading = false, children }: SeoTriggerButtonProps) {
  return (
    <span className="relative inline-flex">
      <Button
        aria-label="SEO Analytics"
        buttonStyle="none"
        className="frseo-doc-btn m-0 w-[calc(var(--base)*1.6)] h-[calc(var(--base)*1.6)] inline-flex items-center justify-center border border-[var(--theme-elevation-100)] rounded-rs bg-transparent text-neutral-800 transition-[border-color,background-color] duration-100 hover:border-neutral-300 hover:bg-neutral-100"
        disabled={loading}
        extraButtonProps={{ title: undefined, "aria-busy": loading }}
        icon={<Gauge />}
        iconStyle="without-border"
        margin={false}
        onClick={onClick}
        size="small"
        tooltip="SEO Analytics"
      />
      {children}
    </span>
  );
}
