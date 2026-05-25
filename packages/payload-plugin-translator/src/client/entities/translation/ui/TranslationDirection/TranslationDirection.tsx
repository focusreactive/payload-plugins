import styles from './styles.module.scss'

interface TranslationDirectionProps {
  sourceLocale: string
  targetLocale: string
  className?: string
}

export const TranslationDirection = ({ sourceLocale, targetLocale, className }: TranslationDirectionProps) => {
  return (
    <div
      className={`${styles.container} ${className || ''}`}
      role="group"
      aria-label={`Translation from ${sourceLocale} to ${targetLocale}`}
    >
      <span className={styles.locale} aria-label={`Source language: ${sourceLocale}`}>
        {sourceLocale.toLowerCase()}
      </span>

      <div className={styles.arrow} aria-hidden="true">
        →
      </div>

      <span className={styles.locale} aria-label={`Target language: ${targetLocale}`}>
        {targetLocale.toLowerCase()}
      </span>
    </div>
  )
}
