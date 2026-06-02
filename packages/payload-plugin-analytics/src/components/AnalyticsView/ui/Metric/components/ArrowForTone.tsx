import { ArrowUp, ArrowDown, ArrowRight } from "lucide-react";
import type { MetricTone } from "../types";

interface Props {
  tone: MetricTone;
}

export function ArrowForTone({ tone }: Props) {
  if (tone === "flat") return <ArrowRight size={11} aria-hidden />;
  if (tone === "positive") return <ArrowUp size={11} aria-hidden />;

  return <ArrowDown size={11} aria-hidden />;
}
