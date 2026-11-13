import { headers as getHeaders } from "next/headers";
import type { BeforeDocumentControlsServerProps, CollectionConfig } from "payload";

import type { AccessGuard } from "../../../../types/AccessGuard.js";
import { askTheGuard } from "../../../../server/shared/access/askTheGuard.js";
import { localeChoicesOf } from "../model/localeChoices.js";

import TranslateDocument from "./TranslateDocument.js";

type TranslateDocumentServerProps = BeforeDocumentControlsServerProps & {
  collection: CollectionConfig;
  access: AccessGuard;
};

async function TranslateDocumentServer(props: TranslateDocumentServerProps) {
  const headers = await getHeaders();
  const mayEnqueue = await askTheGuard(
    props.access,
    { user: props.user, headers, payload: props.payload },
    "enqueue"
  );

  if (!mayEnqueue) return null;
  if (!props.id) return null;

  const { localization } = props.payload.config;
  return (
    <TranslateDocument
      collection={props.collection.slug}
      id={String(props.id)}
      locales={localization ? localeChoicesOf(localization.locales) : []}
    />
  );
}

export default TranslateDocumentServer;
