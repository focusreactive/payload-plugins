"use client";

import { TriangleAlert } from "lucide-react";
import type { HeadingDocIssue } from "../../../../engine/types/analysis";
import { describeDocIssue } from "./headingIssueCopy";

interface HeadingIssueBannerProps {
  issue: HeadingDocIssue;
}

export function HeadingIssueBanner({ issue }: HeadingIssueBannerProps) {
  const { title, body } = describeDocIssue(issue);

  return (
    <div className="mx-[15px] mt-[12px] flex items-start gap-[9px] rounded-rs border border-seo-bad/25 bg-seo-bad-100 px-[11px] py-[9px]">
      <TriangleAlert
        size={15}
        strokeWidth={2.2}
        aria-hidden="true"
        className="mt-[1px] flex-none text-seo-bad"
      />
      <div>
        <div className="text-[12px] font-bold leading-[1.35] text-seo-bad">{title}</div>
        <div className="mt-[2px] text-[11.5px] leading-[1.4] text-neutral-700">{body}</div>
      </div>
    </div>
  );
}
