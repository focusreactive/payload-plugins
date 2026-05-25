import classNames from 'classnames'

import styles from './styles.module.scss'

type LoadingProps = {
  text?: string
  className?: string
  size?: 'small' | 'medium'
}

function Loading({ text, className, size = 'medium' }: LoadingProps) {
  return (
    <div
      className={classNames(styles['loading-overlay'], styles['loading-overlay--entering'], className)}
      style={{ animationDuration: '500ms' }}
    >
      <div className={classNames(styles['loading-overlay__bars'], styles[`loading-overlay__bars_${size}`])}>
        {new Array(size === 'small' ? 2 : 5).fill(null).map((_, index) => (
          <div
            key={index}
            className={classNames(styles['loading-overlay__bar'], styles[`loading-overlay__bar_size-${size}`])}
          />
        ))}
      </div>
      {text && <span className={styles['loading-overlay__text']}>{text}</span>}
    </div>
  )
}

export default Loading
