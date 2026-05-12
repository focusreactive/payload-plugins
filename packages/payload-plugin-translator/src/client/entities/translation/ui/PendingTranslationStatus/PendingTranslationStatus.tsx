import { TrashIcon } from '@payloadcms/ui/icons/Trash'

import { LanguageTranslateIcon } from '../../../../shared/lib/assets/icons/LanguageTranslateIcon'
import { ReloadIcon } from '../../../../shared/lib/assets/icons/ReloadIcon'
import Button from '../../../../shared/ui/Button'
import Divider from '../../../../shared/ui/Divider'
import StatusIndicator from '../../../../shared/ui/StatusIndicator'
import Tooltip from '../../../../shared/ui/Tooltip'
import { TranslationDirection } from '../TranslationDirection'

type TranslationStatusProps = {
  onCancel: () => void
  onRun: () => void
  isLoading?: boolean
  disabled?: boolean
  sourceLocale: string
  targetLocale: string
  createdAt: string
}

export function PendingTranslationStatus({
  onCancel,
  onRun,
  isLoading,
  disabled,
  sourceLocale,
  targetLocale,
  createdAt,
}: TranslationStatusProps) {
  return (
    <StatusIndicator $color="gray" $animated title="Pending">
      <Tooltip
        side="bottom"
        sideOffset={12}
        content={
          <time dateTime={createdAt}>
            Created at:{' '}
            {new Date(createdAt).toLocaleString(undefined, {
              year: 'numeric',
              month: 'short',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            })}
          </time>
        }
      >
        <Button type="button" $variant="unstyled">
          <LanguageTranslateIcon />
        </Button>
      </Tooltip>
      <TranslationDirection sourceLocale={sourceLocale} targetLocale={targetLocale} />
      <Divider $size="sm" $orientation="vertical" />
      <Tooltip sideOffset={12} side="bottom" content="Cancel">
        <Button
          $variant="light"
          $size="sm"
          $isIconButton
          aria-label="Cancel"
          type="button"
          onClick={onCancel}
          disabled={isLoading || disabled}
          $isLoading={isLoading}
        >
          <TrashIcon />
        </Button>
      </Tooltip>
      <Tooltip sideOffset={12} side="bottom" content="Run queued translation">
        <Button
          $variant="light"
          $size="sm"
          $isIconButton
          aria-label="Run queued translation"
          type="button"
          onClick={onRun}
          disabled={isLoading || disabled}
          $isLoading={isLoading}
        >
          <ReloadIcon />
        </Button>
      </Tooltip>
    </StatusIndicator>
  )
}
