import type { PayloadRequest } from "payload";
import { getPluginConfig, isPluginConfigured } from "../../config";
import { resolveAccess } from "../../services/access/resolveAccess";

/**
 * Whether the admin view and its header link are shown to this request's user: the plugin is
 * configured (GA4 credentials present) and the plugin's `access` rule — the same one that guards
 * the data endpoints — lets them in.
 */
export async function canViewAnalytics(req: PayloadRequest): Promise<boolean> {
  if (!isPluginConfigured()) return false;

  return await resolveAccess(getPluginConfig(), req);
}
