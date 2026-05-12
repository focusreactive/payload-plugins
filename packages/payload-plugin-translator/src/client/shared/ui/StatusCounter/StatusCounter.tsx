import classNames from 'classnames'

import StatusIndicator from '../StatusIndicator'

import styles from './styles.module.scss'

type StatusCounterProps = {
  status: 'pending' | 'running' | 'completed' | 'failed'
  count: number
  label?: string
  animated?: boolean
  size?: 'small' | 'medium'
  className?: string
}

const statusColorMap = {
  pending: 'gray' as const,
  running: 'blue' as const,
  completed: 'green' as const,
  failed: 'red' as const,
}

const statusLabelMap = {
  pending: 'В очереди',
  running: 'В процессе',
  completed: 'Завершено',
  failed: 'Ошибки',
}

export default function StatusCounter({
  status,
  count,
  label,
  animated = false,
  size = 'medium',
  className,
}: StatusCounterProps) {
  const displayLabel = label || statusLabelMap[status]
  const color = statusColorMap[status]

  return (
    <div className={classNames(styles.container, styles[size], className)}>
      <StatusIndicator $color={color} $animated={animated && status === 'running'} className={styles.indicator} />
      <div className={styles.content}>
        <span className={styles.count}>{count}</span>
        <span className={styles.label}>{displayLabel}</span>
      </div>
    </div>
  )
}
