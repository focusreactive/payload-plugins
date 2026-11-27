"use client";

import * as Popover from "@radix-ui/react-popover";
import { useState } from "react";

import type { LocaleCode } from "../../../../types/wire/primitives.js";
import type {
  DocumentAddress,
  LocaleRow,
  TranslationScope,
} from "../../../entities/translation/index.js";
import {
  documentEnqueue,
  useCancelDocumentTranslation,
  useDismissStaleness,
  useQueueDocumentTranslation,
  useRunDocumentTranslation,
} from "../../../entities/translation/index.js";
import { useTranslateKitConfig } from "../../../shared/config/index.js";
import { useActionError } from "../../../shared/lib/utils/react/useActionError.js";
import Button from "../../../shared/ui/Button/index.js";

import styles from "./styles.module.scss";

type RunStage = "waiting" | "running" | "ended";

type LocaleActionsProps = {
  document: DocumentAddress;
  source: LocaleCode;
  locale: LocaleCode;
  localeLabel: string;
  row: LocaleRow;
  /** True while the document has a live run: nothing new may start, the run itself stays controllable. */
  startBlocked: boolean;
};

function DismissMenu({ disabled, onDismiss }: { disabled: boolean; onDismiss: () => void }) {
  const [open, setOpen] = useState(false);
  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger asChild>
        <button type="button" className={styles.more} aria-label="More actions" disabled={disabled}>
          ⋯
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content className={styles.menu} align="end" sideOffset={4}>
          <button
            type="button"
            className={styles.menuItem}
            onClick={() => {
              setOpen(false);
              onDismiss();
            }}
          >
            Hide until the source changes
          </button>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}

/** The one action a locale's row offers for its state, and the run controls while it has a run. */
export function LocaleActions({
  document,
  source,
  locale,
  localeLabel,
  row,
  startBlocked,
}: LocaleActionsProps) {
  const { abilities } = useTranslateKitConfig();
  const queue = useQueueDocumentTranslation();
  const runNow = useRunDocumentTranslation();
  const cancel = useCancelDocumentTranslation();
  const dismiss = useDismissStaleness();
  const { error, run } = useActionError();

  const pending = queue.isPending || runNow.isPending || cancel.isPending || dismiss.isPending;
  const startDisabled = startBlocked || pending;

  const translate = (scope: TranslationScope) =>
    run(() => queue.mutateAsync(documentEnqueue({ document, source, targets: [locale], scope })));

  const startButton = (label: string, scope: TranslationScope) =>
    abilities.translate && (
      <Button
        type="button"
        $variant="outlined-light"
        aria-label={`${label} ${localeLabel}`}
        disabled={startDisabled}
        onClick={() => translate(scope)}
      >
        {label}
      </Button>
    );

  const runControls = (locales: readonly LocaleCode[], stage: RunStage) => {
    const covers = locales.join(", ");
    const startsWork = stage === "waiting" || stage === "ended";
    const startLabel = stage === "ended" ? "Retry" : "Run now";
    return (
      <>
        {startsWork && abilities.runNow && (
          <Button
            type="button"
            $variant="outlined-light"
            title={`Acts on the whole run: ${covers}`}
            aria-label={`${startLabel} the run for ${covers}`}
            disabled={pending || (stage === "ended" && startBlocked)}
            onClick={() => run(() => runNow.mutateAsync({ document }))}
          >
            {startLabel}
          </Button>
        )}
        {stage !== "ended" && abilities.cancel && (
          <Button
            type="button"
            $variant="outlined-light"
            title={`Acts on the whole run: ${covers}`}
            aria-label={`Cancel the run for ${covers}`}
            disabled={pending}
            onClick={() => run(() => cancel.mutateAsync({ document }))}
          >
            Cancel
          </Button>
        )}
      </>
    );
  };

  const controls = (() => {
    switch (row.kind) {
      case "behind":
        return (
          abilities.staleness && (
            <>
              {startButton("Update", { kind: "behind" })}
              <DismissMenu
                disabled={startDisabled}
                onDismiss={() =>
                  run(() => dismiss.mutateAsync({ ...document, target_lng: locale }))
                }
              />
            </>
          )
        );
      case "not-translated":
      case "written-by-hand":
        return startButton("Translate", { kind: "whole" });
      case "translated":
        return startButton("Translate again", { kind: "whole" });
      case "queued":
        return runControls(row.locales, "waiting");
      case "translating":
        return runControls(row.locales, "running");
      case "failed":
      case "not-started":
        return runControls(row.locales, "ended");
      default:
        return null;
    }
  })();

  return (
    <div className={styles.actions}>
      <div className={styles.buttons}>{controls}</div>
      {error && (
        <p role="alert" className={styles.error}>
          {error.message}
        </p>
      )}
    </div>
  );
}
