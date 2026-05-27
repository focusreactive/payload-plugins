import { LEAD_ACTION_EVENT_NAME } from "../../constants/events";

interface BaseFilter {
  filter?: {
    fieldName: string;
    stringFilter?: { value: string };
    inListFilter?: { values: string[] };
  };
  andGroup?: { expressions: BaseFilter[] };
}

export function leadActionFilter(types?: string[]): BaseFilter {
  const eventNameFilter: BaseFilter = {
    filter: { fieldName: "eventName", stringFilter: { value: LEAD_ACTION_EVENT_NAME } },
  };

  if (!types || types.length === 0) return eventNameFilter;

  return {
    andGroup: {
      expressions: [
        eventNameFilter,
        {
          filter: {
            fieldName: "customEvent:fr_lead_type",
            inListFilter: { values: types },
          },
        },
      ],
    },
  };
}
