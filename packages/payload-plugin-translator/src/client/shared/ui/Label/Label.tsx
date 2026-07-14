import type { ComponentPropsWithRef, ReactElement } from "react";
import { forwardRef } from "react";

import styles from "./styles.module.scss";

type LabelProps = ComponentPropsWithRef<"label"> & {
  label: string | ReactElement;
  /** Scales the label text to match the control it captions (e.g. a `sm` field gets a smaller label). */
  $size?: "sm" | "md" | "lg";
};

const Label = forwardRef<HTMLLabelElement, LabelProps>(function Label(
  { children, className = "", label, $size, ...props },
  ref
) {
  const sizeClass = $size ? styles[`size-${$size}`] : "";
  return (
    <label ref={ref} className={`${styles.label} ${sizeClass} ${className}`} {...props}>
      <span className={styles.label__text}>{label}</span>
      {children}
    </label>
  );
});

export default Label;
