import classNames from 'classnames'
import type { PropsWithChildren } from 'react'

import ColorIndicator from '../ColorIndicator'

import styles from './styles.module.scss'

type StatusIndicatorProps = PropsWithChildren<{
  $color: 'red' | 'green' | 'blue' | 'gray'
  $animated?: boolean
  title?: string
  className?: string
}>

export default function StatusIndicator({ $color, $animated, title, className, children }: StatusIndicatorProps) {
  const cardClassName = classNames(styles['status-indicator'], styles[$color], className)

  return (
    <div className={cardClassName}>
      <ColorIndicator $color={$color} $animated={$animated} title={title} />
      {children}
    </div>
  )
}
