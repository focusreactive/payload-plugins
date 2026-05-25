import type { ComponentPropsWithRef, ReactElement } from 'react'
import { forwardRef } from 'react'

import styles from './styles.module.scss'

type LabelProps = ComponentPropsWithRef<'label'> & {
  label: string | ReactElement
}

const Label = forwardRef<HTMLLabelElement, LabelProps>(function Label(
  { children, className = '', label, ...props },
  ref,
) {
  return (
    <label ref={ref} className={`${styles.label} ${className}`} {...props}>
      <span className={styles.label__text}>{label}</span>
      {children}
    </label>
  )
})

export default Label
