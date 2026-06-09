import type { CheckId } from "../../../../constants/checkIds";
import type { CheckResult } from "../../../types/analysis";
import type { GaugeSpec, Visualization } from "../../../types/visualization";
import { buildGauge } from "../../buildGauge";
import { formatGaugeValue } from "../../formatGaugeValue";
import { GAUGE_SPECS } from "../../gaugeSpecs";
import { gaugeKeyByCheck } from "../constants";
import { readNumber } from "../utils/readNumber";
import { PRESENCE } from "./resolvePresence";

export const resolveValueRange = (check: CheckResult, data: Record<string, unknown> | undefined): Visualization => {
  const spec: GaugeSpec | undefined = GAUGE_SPECS[check.id as CheckId];
  const markerKey = gaugeKeyByCheck[check.id as CheckId];

  if (!spec || !markerKey) return PRESENCE;

  if (check.id === "keyphraseDensity") {
    const textLength = readNumber(data, "textLength");
    if (textLength != null && textLength < 100) return PRESENCE;
  }

  const markerValue = readNumber(data, markerKey);
  if (markerValue == null) return PRESENCE;

  return {
    type: "value-range",
    gauge: buildGauge(spec, markerValue, formatGaugeValue(markerValue, spec.unit)),
  };
};
