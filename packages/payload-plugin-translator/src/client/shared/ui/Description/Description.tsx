import type { ComponentPropsWithoutRef } from "react";

import styles from "./styles.module.scss";

type DescriptionProps = ComponentPropsWithoutRef<"div"> & {
  id: string;
  variant?: "default" | "error";
};

export default function Description({
  children,
  className = "",
  id,
  variant = "default",
  ...props
}: DescriptionProps) {
  const descriptionClassName = `${styles.description} ${styles[variant]} ${className}`;

  return (
    <p
      id={id}
      className={descriptionClassName}
      role={variant === "error" ? "alert" : undefined}
      aria-live={variant === "error" ? "polite" : undefined}
      {...props}
    >
      {children}
    </p>
  );
}
