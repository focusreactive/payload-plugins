import { cn } from "../../../utils";

type Tone = "default" | "primary" | "muted" | "accent" | "outline";

interface Props {
  children: React.ReactNode;
  tone?: Tone;
  size?: "sm" | "md";
  className?: string;
}

const toneMap: Record<Tone, string> = {
  default: "bg-foreground text-background",
  primary: "bg-primary text-primary-foreground",
  muted: "bg-muted text-foreground",
  accent: "bg-accent text-accent-foreground",
  outline: "border border-foreground text-foreground",
};

const sizeMap = {
  sm: "px-2.5 py-1 text-[10px]",
  md: "px-3 py-1.5 text-[11px]",
};

export function Pill({ children, tone = "muted", size = "md", className }: Props) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-pill font-mono uppercase tracking-[0.12em] leading-none whitespace-nowrap", toneMap[tone], sizeMap[size], className)}>
      {children}
    </span>
  );
}
