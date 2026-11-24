import { cn } from "@/components/utils";

export type EyebrowTone = "default" | "primary" | "muted" | "accent" | "outline";

interface Props {
  children: React.ReactNode;
  /** "dot" = circle prefix; "dash" = em-dash prefix; "none" = no prefix */
  prefix?: "dot" | "dash" | "none";
  tone?: EyebrowTone;
  size?: "sm" | "md";
  className?: string;
}

const toneMap: Record<EyebrowTone, string> = {
  default: "border border-border-strong text-foreground",
  primary: "border border-border-strong bg-surface text-foreground",
  muted: "!px-0 !py-0 text-subtle-foreground",
  accent: "border border-border-strong text-foreground",
  outline: "border border-border-strong text-foreground",
};

const sizeMap = {
  sm: "px-3 py-1 text-small",
  md: "px-4 py-1.5 text-body md:px-5 md:py-2 md:text-[1.25rem] md:leading-6",
};

export function Eyebrow({
  children,
  prefix = "none",
  tone = "primary",
  size = "md",
  className,
}: Props) {
  return (
    <span
      className={cn(
        "inline-flex w-fit items-center gap-2 rounded-pill whitespace-nowrap",
        toneMap[tone],
        sizeMap[size],
        className
      )}
    >
      {prefix === "dash" && <span aria-hidden>—</span>}
      <span>{children}</span>
    </span>
  );
}
