"use client";

import type { LocaleCode } from "../../../../types/wire/primitives.js";
import type { DocumentAddress } from "../../../entities/translation/index.js";
import { documentEnqueue, TranslationsApi } from "../../../entities/translation/index.js";
import { useTranslateKitConfig } from "../../../shared/config/index.js";
import { useActionError } from "../../../shared/lib/utils/react/useActionError.js";
import Button from "../../../shared/ui/Button/index.js";

import styles from "./styles.module.scss";

type TranslateAllLocalesProps = {
  document: DocumentAddress;
  source: LocaleCode;
  /** Every target locale; one written by hand is overwritten too. */
  targets: readonly LocaleCode[];
  startBlocked: boolean;
};

/** Translates the whole document into every target locale at once. */
export function TranslateAllLocales({
  document,
  source,
  targets,
  startBlocked,
}: TranslateAllLocalesProps) {
  const { abilities } = useTranslateKitConfig();
  const queue = TranslationsApi.useQueueDocumentTranslation();
  const { error, run } = useActionError();

  if (!abilities.translate) return null;

  return (
    <div className={styles.all}>
      {error && (
        <p role="alert" className={styles.error}>
          {error.message}
        </p>
      )}
      <Button
        type="button"
        $variant="outlined"
        title={`Translates the whole document into ${targets.join(", ")}`}
        disabled={startBlocked || queue.isPending || targets.length === 0}
        onClick={() =>
          run(() =>
            queue.mutateAsync(
              documentEnqueue({ document, source, targets, scope: { kind: "whole" } })
            )
          )
        }
      >
        Translate all
      </Button>
    </div>
  );
}
