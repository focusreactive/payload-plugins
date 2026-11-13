"use client";

import { useId, useMemo, useState } from "react";

import type { DocumentId, LocaleCode } from "../../../../types/wire/primitives.js";
import {
  describePanelStatus,
  documentPanelStatus,
  PanelStatusMarker,
  useDocumentTranslationState,
} from "../../../entities/translation/index.js";
import { LanguageTranslateIcon } from "../../../shared/lib/assets/icons/LanguageTranslateIcon.js";
import Button from "../../../shared/ui/Button/index.js";
import SideDrawer from "../../../shared/ui/SideDrawer/index.js";
import type { LocaleChoice } from "../model/localeChoices.js";
import { TranslationsPanel } from "./TranslationsPanel.js";
import { useRefetchOnSave } from "./useRefetchOnSave.js";

import styles from "./styles.module.scss";

type TranslateDocumentProps = {
  collection: string;
  id: DocumentId;
  /** The host's locales, source and targets alike. */
  locales: readonly LocaleChoice[];
};

const TranslateDocument = ({ collection, id, locales }: TranslateDocumentProps) => {
  const document = useMemo(() => ({ collection, id }), [collection, id]);
  const read = useDocumentTranslationState(document);
  useRefetchOnSave(read.refetch);

  const [open, setOpen] = useState(false);
  const [chosenSource, setChosenSource] = useState<LocaleCode | null>(null);
  const headingId = useId();

  const source = chosenSource ?? read.data?.sourceLocale ?? locales[0]?.code ?? "";
  const status = read.data ? documentPanelStatus(read.data.locales) : undefined;
  const { tone, title } = describePanelStatus(status, "Translate this document");

  return (
    <>
      <Button
        // Explicit: the trigger sits inside Payload's document form, where a bare button submits.
        type="button"
        $size="md"
        $variant="outlined-light"
        $isIconButton
        className={styles.trigger}
        aria-label={`Open translations — ${title}`}
        aria-haspopup="dialog"
        aria-expanded={open}
        title={title}
        onClick={() => setOpen(true)}
      >
        <LanguageTranslateIcon />
        <PanelStatusMarker tone={tone} />
      </Button>
      <SideDrawer open={open} onClose={() => setOpen(false)} labelledBy={headingId}>
        <TranslationsPanel
          headingId={headingId}
          document={document}
          read={read}
          locales={locales}
          source={source}
          onSourceChange={setChosenSource}
          onClose={() => setOpen(false)}
        />
      </SideDrawer>
    </>
  );
};

export default TranslateDocument;
