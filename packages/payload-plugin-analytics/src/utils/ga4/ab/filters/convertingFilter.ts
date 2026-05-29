import { LEAD_ACTION_EVENT_NAME } from "../../../../constants/events";
import { type AbFilterExpression, exact } from "../../filterExpression";

export function convertingFilter(experimentDim: string, manifestKey: string): AbFilterExpression {
  return {
    andGroup: {
      expressions: [
        exact(`customEvent:${experimentDim}`, manifestKey),
        exact("eventName", LEAD_ACTION_EVENT_NAME),
        exact("pagePath", manifestKey),
      ],
    },
  };
}
