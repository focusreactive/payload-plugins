import classNames from 'classnames'
import type { ComponentPropsWithRef, CSSProperties, ReactNode } from 'react'
import { forwardRef } from 'react'

import Loading from '../Loading'

import styles from './styles.module.scss'

type ButtonProps = ComponentPropsWithRef<'button'> & {
  $fullWidth?: boolean
  $variant?: 'outlined' | 'filled' | 'unstyled' | 'transparent' | 'light'
  $startContent?: ReactNode
  $size?: 'sm' | 'md' | 'lg'
  $isLoading?: boolean
  $isIconButton?: boolean
}

const sizes = {
  sm: {
    height: '24px',
    paddingInline: '0.25rem',
  },
  md: {
    height: '32px',
    paddingInline: '0.5rem',
  },
  lg: {
    height: '40px',
    paddingInline: '0.75rem',
  },
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    className = '',
    children,
    $fullWidth,
    style,
    $startContent,
    $variant,
    $isLoading,
    $size = 'md',
    $isIconButton,
    ...props
  },
  ref,
) {
  const _style = {
    '--button-width': $fullWidth ? '100%' : 'auto',
    '--height': sizes[$size].height,
    '--padding-inline': $isIconButton ? '0' : sizes[$size].paddingInline,
    '--width': $isIconButton ? sizes[$size].height : 'auto',
    ...style,
  } as CSSProperties

  const buttonClassName =
    $variant === 'unstyled'
      ? classNames(styles['unstyled'], className, $isIconButton && styles['icon-button'])
      : classNames(
          styles['button'],
          className,
          $variant ? styles[$variant] : undefined,
          $isIconButton && styles['icon-button'],
        )

  return (
    <button {...props} style={_style} ref={ref} className={buttonClassName}>
      {$startContent && <div className={styles['start-content']}>{$startContent}</div>}
      {$isLoading ? <Loading size={$isIconButton ? 'small' : 'medium'} /> : children}
    </button>
  )
})

export default Button
