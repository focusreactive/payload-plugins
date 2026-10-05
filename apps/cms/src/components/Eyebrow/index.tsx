import { cn } from "@/components/utils";

export type EyebrowTone = "default" | "primary" | "muted" | "accent" | "outline" | "tag";

interface Props {
  children: React.ReactNode;
  /** "dot" = circle prefix (adapts to chip text color); "dash" = em-dash prefix; "none" = no prefix */
  prefix?: "dot" | "dash" | "none";
  tone?: EyebrowTone;
  size?: "sm" | "md";
  className?: string;
}

// §6.6: outline on light, accent (electric green) on dark, tag = pill for tags, muted = text only.
const toneMap: Record<EyebrowTone, string> = {
  default: "rounded-sm bg-secondary text-secondary-foreground",
  primary: "rounded-sm bg-primary-soft text-primary-soft-foreground",
  muted: "!px-0 text-muted-foreground",
  accent: "rounded-sm bg-accent text-accent-foreground",
  outline: "rounded-sm border border-border-strong text-heading",
  tag: "rounded-pill bg-primary-soft text-primary-soft-foreground !normal-case !tracking-normal !font-sans font-medium",
};

const sizeMap = {
  sm: "px-2 py-1 text-[11px]",
  md: "px-2.5 py-[6px] text-[0.75rem]",
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
        "inline-flex w-fit max-w-full items-center gap-1.5 font-mono font-medium uppercase tracking-[0.14em] leading-[1.3] sm:leading-none sm:whitespace-nowrap",
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
