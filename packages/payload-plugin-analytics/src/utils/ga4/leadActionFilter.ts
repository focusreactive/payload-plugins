import { LEAD_ACTION_EVENTS } from "../../constants/events";

export function leadActionFilter() {
  return {
    filter: {
      fieldName: "eventName",
      inListFilter: { values: Object.values(LEAD_ACTION_EVENTS) },
    },
  };
}
