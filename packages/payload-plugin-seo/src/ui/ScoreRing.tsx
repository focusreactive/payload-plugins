"use client";

import { cva } from "class-variance-authority";
import type { VariantProps } from "class-variance-authority";
import { Loader2 } from "lucide-react";
import type { Status } from "../engine/types/analysis";
import { cn } from "../utils/style";
import { statusVar } from "../components/SeoDrawer/variants";

const ringVar = cva("rounded-full flex-none grid place-items-center", {
  variants: {
    size: {
      small: "w-[36px] h-[36px]",
      medium: "w-[60px] h-[60px]",
    },
  },
  defaultVariants: { size: "medium" },
});

const innerVar = cva("rounded-full bg-neutral-0 grid place-items-center font-bold", {
  variants: {
    size: {
      small: "w-[28px] h-[28px] text-[11px]",
      medium: "w-[48px] h-[48px] text-[18px]",
    },
  },
  defaultVariants: { size: "medium" },
});

const loaderVar = cva("animate-spin text-neutral-500", {
  variants: {
    size: {
      small: "w-[16px] h-[16px]",
      medium: "w-[26px] h-[26px]",
    },
  },
  defaultVariants: { size: "medium" },
});

type RingSize = NonNullable<VariantProps<typeof ringVar>["size"]>;

type ScoreRingProps = { size?: RingSize } & (
  | { status: Status; score: number }
  | { status: "idle"; score?: never }
  | { status: "loading"; score?: never }
);

export function ScoreRing({ size = "medium", status, score }: ScoreRingProps) {
  if (status === "loading") {
    return (
      <span className={cn(ringVar({ size }), "bg-neutral-100")}>
        <Loader2 aria-hidden="true" className={loaderVar({ size })} />
      </span>
    );
  }

  const isIdle = status === "idle";
  const fill = isIdle ? 100 : score;

  return (
    <div
      className={cn(ringVar({ size }), statusVar({ status }))}
      style={{
        background: `conic-gradient(var(--seo-c) ${fill}%, var(--theme-elevation-150) 0)`,
      }}
    >
      <div className={innerVar({ size })} style={{ color: "var(--seo-c)" }}>
        {isIdle ? "-" : score}
      </div>
    </div>
  );
}
