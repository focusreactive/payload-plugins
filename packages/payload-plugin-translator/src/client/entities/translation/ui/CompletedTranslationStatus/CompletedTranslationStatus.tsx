import { LanguageTranslateIcon } from "../../../../shared/lib/assets/icons/LanguageTranslateIcon";
import Button from "../../../../shared/ui/Button";
import StatusIndicator from "../../../../shared/ui/StatusIndicator";
import Tooltip from "../../../../shared/ui/Tooltip";
import { TranslationDirection } from "../TranslationDirection";

import styles from "./styles.module.scss";

interface CompletedTranslationStatusProps {
  completed_at: string;
  sourceLocale: string;
  targetLocale: string;
}

export function CompletedTranslationStatus({
  completed_at,
  sourceLocale,
  targetLocale,
}: CompletedTranslationStatusProps) {
  return (
    <StatusIndicator
      className={styles.indicator}
      $color="green"
      title="Completed"
    >
      <Tooltip
        sideOffset={12}
        side="bottom"
        content={
          <time dateTime={completed_at}>
            Completed at:{" "}
            {new Date(completed_at).toLocaleString(undefined, {
              day: "numeric",
              hour: "2-digit",
              minute: "2-digit",
              month: "short",
              year: "numeric",
            })}
          </time>
        }
      >
        <Button type="button" $variant="unstyled">
          <LanguageTranslateIcon />
        </Button>
      </Tooltip>
      <TranslationDirection
        sourceLocale={sourceLocale}
        targetLocale={targetLocale}
      />
    </StatusIndicator>
  );
}
