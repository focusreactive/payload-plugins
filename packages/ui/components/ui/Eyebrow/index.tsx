import { cn } from "../../../utils";

interface Props {
  children: React.ReactNode;
  /** "dot" = orange circle prefix; "dash" = em-dash prefix; "none" = no prefix */
  prefix?: "dot" | "dash" | "none";
  tone?: "default" | "primary" | "muted";
  className?: string;
}

const toneMap = {
  default: "text-foreground",
  primary: "text-primary",
  muted: "text-muted-foreground",
} as const;

export function Eyebrow({ children, prefix = "none", tone = "primary", className }: Props) {
  return (
    <span className={cn("inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.16em]", toneMap[tone], className)}>
      {prefix === "dot" && <span aria-hidden className="inline-block size-1.5 rounded-pill bg-primary" />}
      {prefix === "dash" && <span aria-hidden>—</span>}
      <span>{children}</span>
    </span>
  );
}
