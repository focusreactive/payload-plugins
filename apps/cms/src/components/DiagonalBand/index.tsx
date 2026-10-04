import { cn } from "@/components/utils";

const COLOR = {
  "dark-blue": "bg-ct-dark-blue",
  "light-green": "bg-ct-light-green",
  sand: "bg-ct-sand",
  white: "bg-ct-white",
} as const;

export type DiagonalBandColor = keyof typeof COLOR;

interface DiagonalBandProps {
  /** Colour of the wedge itself; the area above it shows whatever is behind. */
  color?: DiagonalBandColor;
  /** Colour behind the wedge (the section it cuts into). Transparent when omitted. */
  backdrop?: DiagonalBandColor;
  className?: string;
}

/** The client's angled 5vw divider (§6.5): pure CSS, rising from bottom-left to top-right. */
export function DiagonalBand({ color = "light-green", backdrop, className }: DiagonalBandProps) {
  return (
    <div aria-hidden="true" className={cn("w-full", backdrop && COLOR[backdrop], className)}>
      <div
        className={cn("h-[clamp(32px,5vw,96px)] w-full", COLOR[color])}
        style={{ clipPath: "polygon(0 100%, 100% 0, 100% 100%)" }}
      />
    </div>
  );
}
