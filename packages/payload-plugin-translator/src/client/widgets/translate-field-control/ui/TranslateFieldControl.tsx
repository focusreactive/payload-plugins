"use client";

import {
  toast,
  useConfig,
  useDocumentInfo,
  useField,
  useForm,
  useFormFields,
  useLocale,
} from "@payloadcms/ui";
import { useState } from "react";

import { useTranslateField } from "../../../entities/translation/api/mutations/useTranslateField";
import { LanguageTranslateIcon } from "../../../shared/lib/assets/icons/LanguageTranslateIcon";
import { ReloadIcon } from "../../../shared/lib/assets/icons/ReloadIcon";
import { SendIcon } from "../../../shared/lib/assets/icons/SendIcon";
import { useLocaleOptions } from "../../../shared/lib/payload/hooks/useLocaleOptions";
import { useToggle } from "../../../shared/lib/utils/react/useToggle";
import Button from "../../../shared/ui/Button";
import Popup from "../../../shared/ui/Popup";
import Select from "../../../shared/ui/Select";
import Tooltip from "../../../shared/ui/Tooltip";

import styles from "./styles.module.scss";

/**
 * Per-field Translate control, injected into the field's `admin.components.beforeInput`.
 * The trigger is an icon button; clicking it opens a compact popup that reuses the plugin's
 * recognizable `source → target` direction pattern (as on the document/collection level):
 * a small **source** locale `Select`, an arrow, then the **current** locale (the target).
 *
 * **Direction.** The target is *always* the locale the user is editing (`useLocale()`) — never
 * derived from the picker; only the **source** is chosen. This is the reverse of the
 * document/collection level (translate *from* the current locale *to* a chosen target): here we
 * pull content *into* where the user stands. Deliberate, and field-level only for now.
 *
 * The source is an explicit locale (no "auto-detect": the field reads the chosen locale's *saved*
 * value, so it needs a saved document — the control is **hidden entirely while creating** a new
 * one). It defaults to Payload's configured `defaultLocale` when
 * that isn't the current locale, otherwise the user picks. On success the result is written back
 * (see {@link writeFieldValue}) and an **Undo** restores the previous value. Field `value` + `path`
 * come from `useField()` via the field path context (`beforeInput` renders inside it — no `path`
 * prop).
 *
 * **Write-back** is one path for every supported field type: a form `UPDATE` bumping both `value`
 * and `initialValue`. A Lexical (`richText`) editor owns its state and only re-reads on
 * `initialValue` change, so it re-mounts with the new content; `text` / `textarea` inputs just
 * re-render from `value`. So no per-type flag is needed.
 */
const TranslateFieldControl = () => {
  const { value, path } = useField();
  const locale = useLocale();
  const { collectionSlug, id } = useDocumentInfo();
  const { config } = useConfig();
  const { setModified } = useForm();
  const dispatchFields = useFormFields(([, dispatch]) => dispatch);
  const localeOptions = useLocaleOptions();
  const { mutateAsync, isPending } = useTranslateField();

  // `config.localization` is `false | {…}`, so the truthy check is load-bearing (not just a nil guard).
  const defaultLocale = config.localization ? config.localization.defaultLocale : undefined;

  const [isOpen, popup] = useToggle();
  const [sourceLng, setSourceLng] = useState(() =>
    defaultLocale && defaultLocale !== locale.code ? defaultLocale : ""
  );
  // `null` = no undo available; an object wraps the value so a legitimately `undefined` field value
  // (a real pre-translation state) stays distinguishable from "nothing to undo".
  const [undo, setUndo] = useState<{ value: unknown } | null>(null);

  // fieldLevel is off while creating a document: from-locale reads the *saved* document's value,
  // which doesn't exist yet — so the control is hidden entirely on a new/unsaved doc. (Re-enable
  // once translating the unsaved value in place is supported.) All hooks above run unconditionally.
  if (id === undefined || id === null) return null;

  // Source options: every locale except the one being edited (it's the fixed target).
  const sourceLocaleOptions = localeOptions.filter((option) => option.value !== locale.code);
  const canTranslate = sourceLng !== "" && !isPending;

  // One write path for every supported field type: a form UPDATE bumping value AND initialValue.
  // A Lexical (richText) editor re-mounts on the initialValue change so it shows the new content;
  // text/textarea inputs just re-render from value. setModified keeps the form dirty/savable, since
  // value === initialValue would otherwise read as unchanged.
  const writeFieldValue = (next: unknown) => {
    dispatchFields({ type: "UPDATE", path, value: next, initialValue: next });
    setModified(true);
  };

  const handleTranslate = async () => {
    if (!(collectionSlug && canTranslate)) return;
    const previous = value;

    try {
      const { data } = await mutateAsync({
        collectionSlug,
        fieldPath: path,
        targetLng: locale.code, // always the current edit locale — never derived from the source picker
        sourceLng,
        docId: id, // non-null here: the control early-returns on create (no document id)
      });

      if (data.status === "translated") {
        setUndo({ value: previous });
        writeFieldValue(data.value);
        toast.success("Field translated");
        return;
      }

      const notify = data.notice.level === "warning" ? toast.warning : toast.info;
      notify(data.notice.message);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Translation failed");
    }
  };

  const handleUndo = () => {
    if (!undo) return;
    writeFieldValue(undo.value);
    setUndo(null);
  };

  return (
    <Popup
      $align="center"
      $side="right"
      open={isOpen}
      onOpenChange={popup.setValue}
      // Don't auto-focus the first button on open — it's a Tooltip trigger, and Radix tooltips
      // open on focus, so autofocus would flash the Translate button's tooltip immediately.
      onOpenAutoFocus={(event) => event.preventDefault()}
      $trigger={
        <div className={styles.trigger}>
          <Tooltip content="Translate field">
            <Button
              type="button"
              $variant="light"
              $size="sm"
              $isIconButton
              $isLoading={isPending && !isOpen}
              aria-label="Translate field"
              onClick={popup.setTrue}
            >
              <LanguageTranslateIcon />
            </Button>
          </Tooltip>
        </div>
      }
    >
      <div className={styles.popup}>
        <div className={styles.row}>
          {/* The from → to pair as one labeled unit, so a screen reader announces the direction
              together (mirrors the TranslationDirection entity used at the doc/collection level). */}
          <div
            aria-label={`Translation direction: from ${sourceLng || "a source locale"} into ${locale.code}`}
            className={styles.direction}
            role="group"
          >
            <Select
              $fullWidth={false}
              $size="sm"
              aria-label="Source locale"
              value={sourceLng}
              onChange={(event) => setSourceLng(event.target.value)}
              disabled={isPending}
            >
              {sourceLng === "" && (
                <Select.SelectOption value="" disabled>
                  —
                </Select.SelectOption>
              )}
              {sourceLocaleOptions.map((option) => (
                <Select.SelectOption key={option.value} value={option.value}>
                  {option.value.toLowerCase()}
                </Select.SelectOption>
              ))}
            </Select>

            <span aria-hidden="true" className={styles.arrow}>
              →
            </span>
            <span
              aria-label={`Target locale: ${locale.code} (the locale you're editing)`}
              className={styles.current}
            >
              {locale.code.toLowerCase()}
            </span>
          </div>

          <Tooltip content="Translate">
            <Button
              type="button"
              $variant="filled"
              $size="sm"
              $isIconButton
              $isLoading={isPending}
              disabled={!canTranslate}
              aria-label={`Translate from ${sourceLng || "the selected locale"} into ${locale.code}`}
              onClick={handleTranslate}
            >
              <SendIcon />
            </Button>
          </Tooltip>

          {undo && (
            <Tooltip content="Undo translation">
              <Button
                type="button"
                $variant="light"
                $size="sm"
                $isIconButton
                aria-label="Undo translation"
                disabled={isPending}
                onClick={handleUndo}
              >
                <ReloadIcon />
              </Button>
            </Tooltip>
          )}
        </div>
      </div>
    </Popup>
  );
};

export default TranslateFieldControl;
