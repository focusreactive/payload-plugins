import { cn } from "@/components/utils";

export type EyebrowTone = "default" | "primary" | "muted" | "accent" | "outline";

interface Props {
  children: React.ReactNode;
  /** "dot" = circle prefix (adapts to chip text color); "dash" = em-dash prefix; "none" = no prefix */
  prefix?: "dot" | "dash" | "none";
  tone?: EyebrowTone;
  size?: "sm" | "md";
  className?: string;
}

const toneMap: Record<EyebrowTone, string> = {
  default: "bg-foreground text-background",
  primary: "bg-primary text-primary-foreground",
  muted: "text-[var(--color-ink-tertiary)]",
  accent: "bg-accent text-accent-foreground",
  outline: "border border-foreground text-foreground",
};

const sizeMap = {
  sm: "text-[10px]",
  md: "text-[12px] font-semibold",
};

export function Eyebrow({
  children,
  prefix = "none",
  tone = "muted",
  size = "md",
  className,
}: Props) {
  return (
    <span
      className={cn(
        "inline-flex w-fit items-center gap-1.5 font-mono uppercase tracking-[0.14em] leading-none whitespace-nowrap",
        toneMap[tone],
        sizeMap[size],
        className
      )}
    >
      {prefix === "dot" && (
        <span aria-hidden className="inline-block size-1.5 rounded-pill bg-current" />
      )}
      {prefix === "dash" && <span aria-hidden>—</span>}
      <span>{children}</span>
    </span>
  );
}
