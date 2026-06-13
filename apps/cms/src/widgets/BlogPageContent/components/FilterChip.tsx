import { cn } from "@/core/lib/utils";
import { Link } from "@/core/ui";

interface FilterChipProps {
  href: string;
  label: string;
  isActive: boolean;
}

export function FilterChip({ href, label, isActive }: FilterChipProps) {
  return (
    <Link
      href={href}
      aria-current={isActive ? "true" : undefined}
      className={cn(
        "rounded-pill border px-4 py-[9px] font-mono text-[0.72rem] uppercase leading-none tracking-[0.1em] transition-colors motion-reduce:transition-none",
        isActive ? "border-foreground bg-foreground text-background" : "border-border-strong text-muted-foreground hover:border-foreground hover:text-foreground"
      )}
    >
      {label}
    </Link>
  );
}
