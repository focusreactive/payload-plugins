import { headers as getHeaders } from "next/headers";
import type { BeforeListTableServerProps } from "payload";

import type { AccessGuard } from "../../../../types/AccessGuard";
import { collectionHasDrafts } from "../../../../server/shared/guards";
import { resolveAutoTranslateSummary } from "../../../entities/translation/model/autoTranslateSummary";

import BulkTranslationDashboard from "./BulkTranslationDashboard";

type BulkTranslationDashboardServerProps = BeforeListTableServerProps & {
  access: AccessGuard;
};

const BulkTranslationDashboardServer = async (props: BulkTranslationDashboardServerProps) => {
  const headers = await getHeaders();
  const hasAccess = await props.access.check({
    req: { user: props.user, headers, payload: props.payload },
  });

  if (!hasAccess) return null;
  if (!props.collectionSlug) return null;

  const collection = props.payload.collections[props.collectionSlug]?.config;
  const hasDrafts = collection ? collectionHasDrafts(collection) : false;
  const autoTranslate = resolveAutoTranslateSummary(
    collection,
    props.payload.config.localization ? props.payload.config.localization.defaultLocale : undefined
  );

  return <BulkTranslationDashboard hasDrafts={hasDrafts} autoTranslate={autoTranslate} />;
};

export default BulkTranslationDashboardServer;
