import classNames from 'classnames'
import React from 'react'

import styles from './styles.module.scss'

export type AlertVariant = 'transparent' | 'info' | 'warning' | 'error'

export interface AlertProps {
  variant?: AlertVariant
  children: React.ReactNode
  className?: string
}

const getRole = (variant: AlertVariant) => {
  switch (variant) {
    case 'error':
      return 'alert'
    case 'warning':
      return 'alert'
    case 'info':
      return 'status'
    default:
      return 'status'
  }
}

const getAriaLive = (variant: AlertVariant) => {
  switch (variant) {
    case 'error':
      return 'assertive'
    case 'warning':
      return 'polite'
    case 'info':
      return 'polite'
    default:
      return 'polite'
  }
}

const Alert: React.FC<AlertProps> = ({ variant = 'transparent', children, className }) => {
  return (
    <div
      className={classNames(styles.alert, styles[`alert--${variant}`], className)}
      role={getRole(variant)}
      aria-live={getAriaLive(variant)}
      aria-atomic="true"
    >
      {children}
    </div>
  )
}

export default Alert
