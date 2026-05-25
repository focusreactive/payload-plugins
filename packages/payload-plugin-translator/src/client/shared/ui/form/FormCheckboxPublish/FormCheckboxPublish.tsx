import type { ReactElement } from 'react'

import { FormCheckbox } from '../FormCheckbox'
import Tooltip from '../../Tooltip'
import { QuestionCircleIcon } from '../../../lib/assets/icons/QuestionCircleIcon'

import styles from './styles.module.scss'

const PUBLISH_LABEL = 'Publish after translation'

const PUBLISH_TOOLTIP = (
  <>
    When enabled, translated documents will be published immediately.
    <br />
    When disabled, translated documents will be saved as drafts.
  </>
)

const PublishLabel: ReactElement = (
  <span className={styles.label}>
    {PUBLISH_LABEL}
    <Tooltip content={PUBLISH_TOOLTIP} side="bottom">
      <span className={styles.label__icon}>
        <QuestionCircleIcon />
      </span>
    </Tooltip>
  </span>
)

type FormCheckboxPublishProps = {
  name: string
  disabled?: boolean
  className?: string
}

export function FormCheckboxPublish({ name, disabled, className }: FormCheckboxPublishProps) {
  return <FormCheckbox name={name} label={PublishLabel} disabled={disabled} className={className} />
}
