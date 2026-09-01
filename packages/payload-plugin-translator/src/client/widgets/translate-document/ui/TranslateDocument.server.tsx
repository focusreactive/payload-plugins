import { headers as getHeaders } from "next/headers";
import type { BeforeDocumentControlsServerProps, CollectionConfig } from "payload";

import type { AccessGuard } from "../../../../types/AccessGuard";
import type { TargetSelectionMode } from "../../../../types/TargetSelection";
import { hasDraftsEnabled } from "payload/shared";
import { resolveAutoTranslateSummary } from "../../../entities/translation/model/autoTranslateSummary";

import TranslateDocument from "./TranslateDocument";

type TranslateDocumentServerProps = BeforeDocumentControlsServerProps & {
  collection: CollectionConfig;
  access: AccessGuard;
  targetSelection: TargetSelectionMode;
};

async function TranslateDocumentServer(props: TranslateDocumentServerProps) {
  const headers = await getHeaders();
  const hasAccess = await props.access.check({
    req: { user: props.user, headers, payload: props.payload },
  });

  if (!hasAccess) return null;
  if (!props.id) return null;

  const hasDrafts = hasDraftsEnabled(props.collection);
  const autoTranslate = resolveAutoTranslateSummary(
    props.collection,
    props.payload.config.localization ? props.payload.config.localization.defaultLocale : undefined
  );

  return (
    <TranslateDocument
      hasDrafts={hasDrafts}
      autoTranslate={autoTranslate}
      targetSelection={props.targetSelection}
    />
  );
}

export default TranslateDocumentServer;
