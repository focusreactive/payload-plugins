import { cn } from "@/components/utils";

function splitTitle(text: string): Array<{ type: "plain" | "accent"; value: string }> {
  if (!text) return [];
  const re = /\*([^*]+)\*/gu;
  const out: Array<{ type: "plain" | "accent"; value: string }> = [];
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    if (m.index > last) out.push({ type: "plain", value: text.slice(last, m.index) });
    out.push({ type: "accent", value: m[1] ?? "" });
    last = m.index + m[0].length;
  }
  if (last < text.length) out.push({ type: "plain", value: text.slice(last) });
  return out;
}

const sizeMap = {
  sm: "text-3xl sm:text-4xl md:text-5xl",
  md: "text-4xl sm:text-5xl md:text-6xl",
  lg: "text-5xl sm:text-6xl md:text-7xl",
  xl: "text-5xl leading-[0.95] sm:text-6xl md:text-7xl lg:text-[clamp(3.5rem,7vw,6.5rem)]",
  "display-1": "text-display-1",
  "display-2": "text-display-2",
  "h-section": "text-h-section",
} as const;

type Size = keyof typeof sizeMap;

const TOKEN_SIZES: ReadonlySet<Size> = new Set(["display-1", "display-2", "h-section"]);

interface Props {
  as?: "h1" | "h2" | "h3";
  text: string;
  size?: Size;
  className?: string;
  accentClassName?: string;
}

export function DisplayHeading({
  as: Tag = "h2",
  text,
  size = "lg",
  className,
  accentClassName,
}: Props) {
  const parts = splitTitle(text);

  return (
    <Tag
      className={cn(
        "font-display text-balance text-primary",
        sizeMap[size],
        !TOKEN_SIZES.has(size) && [
          "tracking-tight",
          size === "xl" ? "leading-[0.95]" : "leading-[1.05]",
        ],
        className
      )}
    >
      {parts.map((p, i) =>
        p.type === "accent" ? (
          <em key={i} className={cn("font-display not-italic text-highlight", accentClassName)}>
            {p.value}
          </em>
        ) : (
          <span key={i}>{p.value}</span>
        )
      )}
    </Tag>
  );
}
