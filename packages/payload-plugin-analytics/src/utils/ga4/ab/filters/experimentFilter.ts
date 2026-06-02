import { exact } from "../../filterExpression";
import type { AbFilterExpression } from "../../filterExpression";

export function experimentFilter(experimentDim: string, manifestKey: string): AbFilterExpression {
  return exact(`customEvent:${experimentDim}`, manifestKey);
}
