import { headers as getHeaders } from "next/headers";
import type { BeforeListTableServerProps } from "payload";

import { collectionHasDrafts } from "../../../../server/shared/guards";
import type { AccessGuard } from "../../../../types/AccessGuard";
import BulkTranslationDashboard from "./BulkTranslationDashboard";

type BulkTranslationDashboardServerProps = BeforeListTableServerProps & {
  access: AccessGuard;
};

const BulkTranslationDashboardServer = async (
  props: BulkTranslationDashboardServerProps
) => {
  const headers = await getHeaders();
  const hasAccess = await props.access.check({
    req: { headers, payload: props.payload, user: props.user },
  });

  if (!hasAccess) {return null;}
  if (!props.collectionSlug) {return null;}

  const collection = props.payload.collections[props.collectionSlug]?.config;
  const hasDrafts = collection ? collectionHasDrafts(collection) : false;

  return <BulkTranslationDashboard hasDrafts={hasDrafts} />;
};

export default BulkTranslationDashboardServer;
