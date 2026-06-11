import { cn } from "../../../utils";

interface AbstractBackdropProps {
  variant?: "orbs" | "blobs";
  className?: string;
}

const SHAPES: Record<NonNullable<AbstractBackdropProps["variant"]>, string[]> = {
  orbs: [
    "-left-[10%] -top-[14%] size-[540px] bg-[#0d9488] opacity-50 blur-[72px] animate-[backdrop-float-a_19s_var(--ease-in-out)_infinite]",
    "right-[2%] top-[14%] size-[380px] bg-[#1fb9a6] opacity-[0.38] blur-[72px] animate-[backdrop-float-b_23s_var(--ease-in-out)_infinite]",
    "-bottom-[8%] right-[28%] size-[260px] bg-accent opacity-[0.18] blur-[72px] animate-[backdrop-float-a_27s_var(--ease-in-out)_infinite_reverse]",
  ],
  blobs: [
    "-left-[6%] -top-[34%] size-[460px] bg-[#6fd0c2] opacity-40 blur-[90px] animate-[backdrop-float-a_21s_var(--ease-in-out)_infinite]",
    "-right-[4%] -top-[24%] size-[380px] bg-[#d7ff72] opacity-30 blur-[90px] animate-[backdrop-float-b_25s_var(--ease-in-out)_infinite]",
    "-bottom-[44%] left-[42%] size-[440px] bg-[#9ce4da] opacity-[0.36] blur-[90px] animate-[backdrop-float-a_29s_var(--ease-in-out)_infinite_reverse]",
  ],
};

export function AbstractBackdrop({ variant = "orbs", className }: AbstractBackdropProps) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        "pointer-events-none absolute inset-0 overflow-hidden",
        variant === "orbs" && "bg-[#070f0d] bg-[radial-gradient(120%_90%_at_78%_8%,#103a34_0%,transparent_52%),radial-gradient(110%_100%_at_8%_100%,#0a201d_0%,transparent_58%)]",
        className
      )}
    >
      {SHAPES[variant].map((shape) => (
        <div key={shape} className={cn("absolute rounded-pill will-change-transform motion-reduce:animate-none", shape)} />
      ))}
    </div>
  );
}
