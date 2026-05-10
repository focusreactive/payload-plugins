import type { AnalyticsProvider } from "../../types/provider";
import type { AutoTrackLeadActionsConfig } from "../../types/config";
import { installDirectionsClick } from "./directionsClick";
import { installEmailClick } from "./emailClick";
import { installFormSubmit } from "./formSubmit";
import { installTelegramClick, installWhatsappClick } from "./messengerClick";
import { installPhoneClick } from "./phoneClick";

export function installLeadActionListeners(
  provider: AnalyticsProvider,
  options: AutoTrackLeadActionsConfig | undefined = {},
): () => void {
  if (typeof document === "undefined") return () => {};
  
  const cleanups: Array<() => void> = [];

  if (options.phoneClicks ?? true) cleanups.push(installPhoneClick(provider));
  if (options.emailClicks ?? true) cleanups.push(installEmailClick(provider));
  if (options.directionsClicks ?? true) cleanups.push(installDirectionsClick(provider));
  if (options.whatsappClicks ?? true) cleanups.push(installWhatsappClick(provider));
  if (options.telegramClicks ?? true) cleanups.push(installTelegramClick(provider));
  if (options.formSubmits ?? false) cleanups.push(installFormSubmit(provider));

  return () => cleanups.forEach((c) => c());
}
