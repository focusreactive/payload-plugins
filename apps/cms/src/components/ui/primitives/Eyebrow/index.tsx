import { cn } from "@/components/ui/utils";

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
  muted: "text-muted-foreground",
  accent: "bg-accent text-accent-foreground",
  outline: "border border-foreground text-foreground",
};

const sizeMap = {
  sm: "px-2.5 py-1 text-[10px]",
  md: "px-3.5 py-[7px] text-[0.72rem] font-semibold",
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
        "inline-flex w-fit items-center gap-1.5 rounded-pill font-mono uppercase tracking-[0.16em] leading-none whitespace-nowrap",
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
