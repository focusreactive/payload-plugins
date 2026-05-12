import classNames from 'classnames'

import styles from './styles.module.scss'

type ColorIndicatorProps = {
  $color: 'red' | 'green' | 'blue' | 'gray'
  $animated?: boolean
  title?: string
  className?: string
}

export default function ColorIndicator({ $color, $animated, title, className }: ColorIndicatorProps) {
  return (
    <div
      title={title}
      className={classNames(
        styles.indicator,
        styles[`${$color}-indicator`],
        {
          [styles.animated]: $animated,
        },
        className,
      )}
    />
  )
}
