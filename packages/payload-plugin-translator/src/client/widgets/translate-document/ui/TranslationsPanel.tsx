"use client";

import type { UseQueryResult } from "@tanstack/react-query";

import type { DocumentTranslationState } from "../../../../types/wire/DocumentTranslationState.js";
import type { LocaleCode } from "../../../../types/wire/primitives.js";
import type { DocumentAddress } from "../../../entities/translation/index.js";
import { hasLiveRun } from "../../../entities/translation/index.js";
import { TranslateAllLocales } from "../../../features/translate-all-locales/index.js";
import { useTranslateKitConfig } from "../../../shared/config/index.js";
import { CloseIcon } from "../../../shared/lib/assets/icons/CloseIcon.js";
import type { LocaleChoice } from "../../../entities/translation/index.js";
import { LocaleRowView } from "./LocaleRowView.js";

import styles from "./styles.module.scss";

type TranslationsPanelProps = {
  headingId: string;
  document: DocumentAddress;
  read: Pick<UseQueryResult<DocumentTranslationState>, "data" | "isError" | "refetch">;
  locales: readonly LocaleChoice[];
  source: LocaleCode;
  onClose: () => void;
};

function Rows({
  document,
  state,
  source,
  labelOf,
}: {
  document: DocumentAddress;
  state: DocumentTranslationState;
  source: LocaleCode;
  labelOf: (locale: LocaleCode) => string;
}) {
  const startBlocked = hasLiveRun(state.locales);
  const now = new Date();
  return (
    <ul className={styles.rows}>
      {state.locales.map((locale) => (
        <LocaleRowView
          key={locale.locale}
          document={document}
          state={locale}
          tree={state.tree}
          excluded={state.excluded}
          source={source}
          labelOf={labelOf}
          startBlocked={startBlocked}
          now={now}
        />
      ))}
    </ul>
  );
}

function Body({
  read,
  document,
  source,
  labelOf,
}: Pick<TranslationsPanelProps, "read" | "document" | "source"> & {
  labelOf: (locale: LocaleCode) => string;
}) {
  if (read.isError) {
    return (
      <div className={styles.notice} role="alert">
        <p className={styles.noticeTitle}>Couldn’t load the translation status.</p>
        <p className={styles.noticeText}>
          Nothing was changed. Translating still works — only what each locale holds is unknown.
        </p>
        <button type="button" className={styles.action} onClick={() => void read.refetch()}>
          Try again
        </button>
      </div>
    );
  }
  if (!read.data) {
    return (
      <div className={styles.loading} aria-busy="true" aria-label="Loading translations">
        {[0, 1, 2].map((bar) => (
          <span key={bar} className={styles.bar} />
        ))}
      </div>
    );
  }
  if (read.data.locales.length === 0) {
    return (
      <div className={styles.notice}>
        <p className={styles.noticeTitle}>This collection has nothing to translate into.</p>
        <p className={styles.noticeText}>
          Only one locale is configured, or the source locale is the only one left. Add locales in
          Payload’s localization config to translate this document.
        </p>
      </div>
    );
  }
  return <Rows document={document} state={read.data} source={source} labelOf={labelOf} />;
}

/** The drawer's content: the source, one row per target locale, and the whole-document actions. */
export function TranslationsPanel({
  headingId,
  document,
  read,
  locales,
  source,
  onClose,
}: TranslationsPanelProps) {
  const { collections } = useTranslateKitConfig();
  const labelOf = (code: LocaleCode) =>
    locales.find((choice) => choice.code === code)?.label ?? code;

  const targets = (
    read.data ? read.data.locales.map(({ locale }) => locale) : locales.map(({ code }) => code)
  ).filter((code) => code !== source);
  const hasTargets = read.isError || (read.data?.locales.length ?? 0) > 0;
  const autoTargets = collections[document.collection]?.autoTranslateTargets ?? [];

  return (
    <>
      <header className={styles.head}>
        <h2 id={headingId} className={styles.heading}>
          Translations
        </h2>
        {source !== "" && <span className={styles.from}>From {labelOf(source)}</span>}
        <button type="button" className={styles.close} aria-label="Close panel" onClick={onClose}>
          <CloseIcon />
        </button>
      </header>

      <div className={styles.body}>
        <Body read={read} document={document} source={source} labelOf={labelOf} />
        {autoTargets.length > 0 && read.data && (
          <p className={styles.auto}>
            Auto-translates into {autoTargets.join(" · ")} when {labelOf(read.data.sourceLocale)} is
            published — and publishes those translations.
          </p>
        )}
      </div>

      {hasTargets && (
        <footer className={styles.foot}>
          <span className={styles.drafts}>Saved as drafts — publish with Payload’s Publish.</span>
          <TranslateAllLocales
            document={document}
            source={source}
            targets={targets}
            startBlocked={read.data ? hasLiveRun(read.data.locales) : false}
          />
        </footer>
      )}
    </>
  );
}
