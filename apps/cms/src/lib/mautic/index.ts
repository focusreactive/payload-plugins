import { getSiteSettings } from "@/dal";

export interface MauticFormTarget {
  /** `null` until a Mautic URL (Site Settings → Integrations) and a form id are set. */
  action: string | null;
  formId: string;
  formName: string;
}

async function getIntegrations() {
  const { integrations } = await getSiteSettings({});
  return integrations;
}

function actionFor(baseUrl: string | null | undefined, formId: string) {
  const base = baseUrl?.trim().replace(/\/+$/u, "");
  return base && formId ? `${base}/form/submit?formId=${encodeURIComponent(formId)}` : null;
}

export async function getMauticForm(formId: string, formName: string): Promise<MauticFormTarget> {
  const integrations = await getIntegrations();
  return { action: actionFor(integrations?.mauticUrl, formId), formId, formName };
}

export async function getNewsletterForm(): Promise<MauticFormTarget> {
  const integrations = await getIntegrations();
  const formId = integrations?.newsletterForm?.mauticFormId ?? "";
  return {
    action: actionFor(integrations?.mauticUrl, formId),
    formId,
    formName: integrations?.newsletterForm?.mauticFormName ?? "newsletter",
  };
}
