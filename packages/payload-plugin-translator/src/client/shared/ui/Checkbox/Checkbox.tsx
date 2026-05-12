import type { ComponentPropsWithRef } from 'react'
import { forwardRef } from 'react'

import styles from './styles.module.scss'

type CheckboxProps = Omit<ComponentPropsWithRef<'input'>, 'type'> & {
  hasError?: boolean
}

const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(function Checkbox(
  { className = '', hasError, ...props },
  ref,
) {
  return (
    <input
      ref={ref}
      type="checkbox"
      className={`${styles.checkbox} ${hasError ? styles['checkbox--error'] : ''} ${className}`}
      {...props}
    />
  )
})

export default Checkbox
