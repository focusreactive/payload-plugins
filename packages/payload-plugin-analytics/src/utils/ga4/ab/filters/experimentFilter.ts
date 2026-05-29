import { type AbFilterExpression, exact } from "../../filterExpression";

export function experimentFilter(experimentDim: string, manifestKey: string): AbFilterExpression {
  return exact(`customEvent:${experimentDim}`, manifestKey);
}
