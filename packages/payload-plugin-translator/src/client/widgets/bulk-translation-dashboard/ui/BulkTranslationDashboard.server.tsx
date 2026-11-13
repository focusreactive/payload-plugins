import { headers as getHeaders } from "next/headers";
import type { BeforeListTableServerProps } from "payload";

import type { AccessGuard } from "../../../../types/AccessGuard.js";
import { askTheGuard } from "../../../../server/shared/access/askTheGuard.js";
import { localeChoicesOf } from "../../../entities/translation/model/localeChoices.js";

import BulkTranslationDashboard from "./BulkTranslationDashboard.js";

type BulkTranslationDashboardServerProps = BeforeListTableServerProps & {
  access: AccessGuard;
};

const BulkTranslationDashboardServer = async (props: BulkTranslationDashboardServerProps) => {
  const headers = await getHeaders();
  const mayEnqueue = await askTheGuard(
    props.access,
    { user: props.user, headers, payload: props.payload },
    "enqueue"
  );

  if (!mayEnqueue) return null;
  if (!props.collectionSlug) return null;

  const { localization } = props.payload.config;
  return (
    <BulkTranslationDashboard
      collection={props.collectionSlug}
      locales={localization ? localeChoicesOf(localization.locales) : []}
      defaultLocale={localization ? localization.defaultLocale : undefined}
    />
  );
};

export default BulkTranslationDashboardServer;
