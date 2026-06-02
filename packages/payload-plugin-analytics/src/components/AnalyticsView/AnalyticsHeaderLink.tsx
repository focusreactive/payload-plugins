"use client";

import Link from "next/link";
import { BarChart3 } from "lucide-react";
import { useTranslation } from "@payloadcms/ui";
import { cn } from "../../utils/style";

export default function AnalyticsHeaderLink() {
  const { t } = useTranslation();
  const title = t("analytics:title" as never);

  return (
    <Link
      className={cn(
        `w-[24px] h-[24px] flex justify-center items-center p-0 rounded border-none transition-colors cursor-pointer
        bg-(--theme-elevation-100) hover:bg-(--theme-elevation-150) text-(--theme-elevation-600) hover:text-(--theme-text)`
      )}
      href="/admin/analytics"
      title={title}
      aria-label={title}
    >
      <BarChart3 size={16} />
    </Link>
  );
}
