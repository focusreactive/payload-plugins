import { LanguageTranslateIcon } from "../../../../shared/lib/assets/icons/LanguageTranslateIcon";
import { ReloadIcon } from "../../../../shared/lib/assets/icons/ReloadIcon";
import Button from "../../../../shared/ui/Button";
import Divider from "../../../../shared/ui/Divider";
import StatusIndicator from "../../../../shared/ui/StatusIndicator";
import Tooltip from "../../../../shared/ui/Tooltip";
import { TranslationDirection } from "../TranslationDirection";

import styles from "./styles.module.scss";

interface FailedTranslationStatusProps {
  message: string;
  sourceLocale: string;
  targetLocale: string;
  isLoading?: boolean;
  onRetry: () => void;
}

export function FailedTranslationStatus({
  onRetry,
  message,
  isLoading,
  sourceLocale,
  targetLocale,
}: FailedTranslationStatusProps) {
  return (
    <StatusIndicator $color="red" title="Failed">
      <Tooltip sideOffset={12} side="bottom" content={message}>
        <Button type="button" $variant="unstyled">
          <LanguageTranslateIcon />
        </Button>
      </Tooltip>
      <TranslationDirection
        sourceLocale={sourceLocale}
        targetLocale={targetLocale}
      />
      <Divider className={styles.divider} $orientation="vertical" $size="sm" />
      <Tooltip side="bottom" sideOffset={12} content="Retry">
        <Button
          $variant="light"
          $size="sm"
          $isIconButton
          aria-label="Retry failed translation"
          type="button"
          onClick={onRetry}
          disabled={isLoading}
          $isLoading={isLoading}
        >
          <ReloadIcon />
        </Button>
      </Tooltip>
    </StatusIndicator>
  );
}
