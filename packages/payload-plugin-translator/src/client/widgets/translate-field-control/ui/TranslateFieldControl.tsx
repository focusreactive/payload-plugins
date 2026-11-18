"use client";

import {
  useConfig,
  useDocumentInfo,
  useField,
  useForm,
  useFormFields,
  useLocale,
} from "@payloadcms/ui";
import * as Popover from "@radix-ui/react-popover";
import { useMemo, useState } from "react";

import type { LocaleCode } from "../../../../types/wire/primitives.js";
import { localeChoicesOf, useTranslateField } from "../../../entities/translation/index.js";
import { useTranslateKitConfig } from "../../../shared/config/index.js";
import { LanguageTranslateIcon } from "../../../shared/lib/assets/icons/LanguageTranslateIcon.js";
import Button from "../../../shared/ui/Button/index.js";
import InfoPopover from "../../../shared/ui/InfoPopover/index.js";
import type { ControlOutcome, SourceChoice } from "../model/fieldControl.js";
import {
  fieldControlView,
  outcomeOf,
  showsSourceMenu,
  sourceChoicesOf,
} from "../model/fieldControl.js";

import styles from "./styles.module.scss";

const SAVE_HINT = "Save the document to pull from another locale.";
const LOCALIZED_LIST_HINT =
  "Every locale has its own blocks here, so this block cannot be traced to an English one. Translate the whole document from the panel.";

const asError = (reason: unknown): Error =>
  reason instanceof Error ? reason : new Error(String(reason));

function SourceMenu({
  sources,
  onPick,
}: {
  sources: readonly SourceChoice[];
  onPick: (source: LocaleCode) => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger asChild>
        <button
          type="button"
          className={`${styles.part} ${styles.caret}`}
          aria-label="Choose another source locale"
        >
          <svg width="9" height="9" viewBox="0 0 10 10" fill="none" aria-hidden="true">
            <path d="M1 3l4 4 4-4" stroke="currentColor" strokeWidth="1.5" />
          </svg>
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content className={styles.menu} align="end" sideOffset={4} aria-label="Pull from">
          {sources.map((source) => (
            <button
              key={source.code}
              type="button"
              className={styles.menuItem}
              aria-label={`Translate from ${source.label}`}
              onClick={() => {
                setOpen(false);
                onPick(source.code);
              }}
            >
              <span className={source.panels ? styles.panels : undefined}>{source.label}</span>
              {source.panels && <span className={styles.panelsMark}> · the panel&rsquo;s</span>}
            </button>
          ))}
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}

function DisabledTranslate({ hint }: { hint: string }) {
  return (
    <>
      <InfoPopover label={hint} content={hint} />
      <Button type="button" $variant="outlined-light" $size="sm" disabled>
        Translate
      </Button>
    </>
  );
}

/**
 * Per-field Translate control, injected into the field's `admin.components.beforeInput`. It pulls
 * the field's saved value from another locale into the locale being edited and writes the answer
 * into the form only: Payload's own Save persists it.
 *
 * Write-back is a form `UPDATE` of both `value` and `initialValue`: a Lexical editor re-reads only on
 * `initialValue` change, so it re-mounts with the new content; plain inputs re-render from `value`.
 */
const TranslateFieldControl = () => {
  const { abilities } = useTranslateKitConfig();
  const { value, path } = useField<unknown>();
  const locale = useLocale();
  const { collectionSlug, id } = useDocumentInfo();
  const { config } = useConfig();
  const { setModified, setProcessing } = useForm();
  const dispatchFields = useFormFields(([, dispatch]) => dispatch);
  const { mutateAsync } = useTranslateField();
  const [outcome, setOutcome] = useState<ControlOutcome>({ kind: "idle" });

  const target = locale?.code ?? "";
  const { localization } = config;
  const sources = useMemo(
    () =>
      localization
        ? sourceChoicesOf({
            locales: localeChoicesOf(localization.locales),
            defaultLocale: localization.defaultLocale,
            target,
          })
        : [],
    [localization, target]
  );
  const saved = collectionSlug !== undefined && id !== undefined && id !== null;
  const view = fieldControlView({ allowed: abilities.translateField, saved, sources, outcome });

  const writeFieldValue = (next: unknown) => {
    dispatchFields({ type: "UPDATE", path, value: next, initialValue: next });
    setModified(true);
  };

  const translate = async (source: LocaleCode, previous: unknown) => {
    if (!saved) return;
    setOutcome({ kind: "translating", source, previous });
    setProcessing(true);
    try {
      const answer = await mutateAsync({
        collectionSlug,
        fieldPath: path,
        targetLng: target,
        sourceLng: source,
        docId: id,
      });
      if (answer.status === "translated") writeFieldValue(answer.value);
      setOutcome(outcomeOf(answer, { source, previous }));
    } catch (reason) {
      setOutcome({ kind: "failed", source, previous, error: asError(reason) });
    } finally {
      setProcessing(false);
    }
  };

  const repeat = () => {
    if (outcome.kind === "translated" || outcome.kind === "failed") {
      void translate(outcome.source, outcome.previous);
    }
  };

  const undo = () => {
    if (outcome.kind !== "translated") return;
    writeFieldValue(outcome.previous);
    setOutcome({ kind: "idle" });
  };

  const body = () => {
    switch (view.kind) {
      case "hidden":
        return null;
      case "unsaved":
        return <DisabledTranslate hint={SAVE_HINT} />;
      case "localized-list":
        return <DisabledTranslate hint={LOCALIZED_LIST_HINT} />;
      case "translating":
        return (
          <span role="status" className={styles.progress}>
            <span aria-hidden="true" className={styles.spinner} />
            Translating
          </span>
        );
      case "translated":
        return (
          <>
            <Button type="button" $variant="outlined-light" $size="sm" onClick={undo}>
              Undo
            </Button>
            <Button type="button" $variant="outlined-light" $size="sm" onClick={repeat}>
              Again
            </Button>
          </>
        );
      case "failed":
        return (
          <>
            <span role="alert" className={styles.error} title={view.error.message}>
              <span aria-hidden="true">!</span> Couldn&rsquo;t translate
            </span>
            <Button type="button" $variant="outlined-light" $size="sm" onClick={repeat}>
              Try again
            </Button>
          </>
        );
      case "ready": {
        const [primary] = sources;
        if (!primary) return null;
        return (
          <>
            {view.notice && (
              <span
                role="status"
                className={view.notice.level === "warning" ? styles.warning : styles.notice}
              >
                {view.notice.message}
              </span>
            )}
            <span className={styles.split}>
              <button
                type="button"
                className={`${styles.part} ${styles.main}`}
                title={`From ${primary.label}`}
                onClick={() => void translate(primary.code, value)}
              >
                <LanguageTranslateIcon />
                Translate
              </button>
              {showsSourceMenu(sources) && (
                <SourceMenu sources={sources} onPick={(source) => void translate(source, value)} />
              )}
            </span>
          </>
        );
      }
      default: {
        const exhaustive: never = view;
        return exhaustive;
      }
    }
  };

  const content = body();
  return content && <div className={styles.control}>{content}</div>;
};

export default TranslateFieldControl;
