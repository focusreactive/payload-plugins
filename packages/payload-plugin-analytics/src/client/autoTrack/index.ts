import type { AnalyticsProvider } from "../../types/provider";
import type { AutoTrackLeadActionsConfig } from "../../types/config";
import { installDirectionsClick } from "./directionsClick";
import { installEmailClick } from "./emailClick";
import { installFormSubmit } from "./formSubmit";
import { installTelegramClick, installWhatsappClick } from "./messengerClick";
import { installPhoneClick } from "./phoneClick";

interface BuiltInListener {
  type: string;
  install: (provider: AnalyticsProvider) => () => void;
  flagKey: keyof AutoTrackLeadActionsConfig;
  defaultFlag: boolean;
}

const BUILT_INS: BuiltInListener[] = [
  { type: "phone_click", install: installPhoneClick, flagKey: "phoneClicks", defaultFlag: true },
  { type: "email_click", install: installEmailClick, flagKey: "emailClicks", defaultFlag: true },
  {
    type: "directions_click",
    install: installDirectionsClick,
    flagKey: "directionsClicks",
    defaultFlag: true,
  },
  {
    type: "whatsapp_click",
    install: installWhatsappClick,
    flagKey: "whatsappClicks",
    defaultFlag: true,
  },
  {
    type: "telegram_click",
    install: installTelegramClick,
    flagKey: "telegramClicks",
    defaultFlag: true,
  },
  { type: "form_submit", install: installFormSubmit, flagKey: "formSubmits", defaultFlag: false },
];

export function installLeadActionListeners(
  provider: AnalyticsProvider,
  options: AutoTrackLeadActionsConfig | undefined = {},
  types: readonly string[] = []
): () => void {
  if (typeof document === "undefined") return () => undefined;

  const allowed = new Set(types);
  const cleanups: Array<() => void> = [];

  for (const { type, install, flagKey, defaultFlag } of BUILT_INS) {
    if (!allowed.has(type)) continue;
    const flag = options[flagKey] ?? defaultFlag;
    if (!flag) continue;
    cleanups.push(install(provider));
  }

  return () => cleanups.forEach((c) => c());
}
