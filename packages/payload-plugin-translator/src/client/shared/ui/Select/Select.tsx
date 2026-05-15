import classNames from "classnames";
import type {
  ComponentPropsWithoutRef,
  ComponentPropsWithRef,
  CSSProperties,
} from "react";
import { forwardRef } from "react";

import styles from "./styles.module.scss";

type SelectProps = ComponentPropsWithRef<"select"> & {
  emptyOption?: boolean;
  hasError?: boolean;
  $size?: "sm" | "md" | "lg";
  "aria-describedby"?: string;
  "aria-invalid"?: boolean;
};

const sizes = {
  lg: {
    fontSize: "1rem",
    height: "40px",
    paddingInline: "0.75rem",
  },
  md: {
    fontSize: "1rem",
    height: "32px",
    paddingInline: "0.5rem",
  },
  sm: {
    fontSize: "0.875rem",
    height: "24px",
    paddingInline: "0.25rem",
  },
};
type SelectOptionProps = ComponentPropsWithoutRef<"option">;
type SelectEmptyOptionProps = Omit<
  SelectOptionProps,
  "value" | "disabled" | "hidden"
>;

const SelectOption = ({ children, ...props }: SelectOptionProps) => (
  <option {...props}>{children}</option>
);

const SelectEmptyOption = ({ children, ...props }: SelectEmptyOptionProps) => (
  <option value="" {...props}>
    {children}
  </option>
);

const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  {
    children,
    className = "",
    hasError = false,
    $size = "lg",
    style,
    "aria-invalid": ariaInvalid,
    ...props
  },
  ref
) {
  const _style: CSSProperties = {
    "--font-size": sizes[$size].fontSize,
    "--height": sizes[$size].height,
    "--padding-inline": sizes[$size].paddingInline,
    ...style,
  } as CSSProperties;

  const selectClassName = classNames(
    styles.select,
    styles[`size-${$size}`],
    {
      [styles.selectError]: hasError,
    },
    className
  );

  return (
    <select
      ref={ref}
      className={selectClassName}
      style={_style}
      aria-invalid={ariaInvalid ?? hasError}
      {...props}
    >
      {children}
    </select>
  );
});

type SelectComponent = typeof Select & {
  SelectOption: typeof SelectOption;
  SelectEmptyOption: typeof SelectEmptyOption;
};
(Select as SelectComponent).SelectOption = SelectOption;
(Select as SelectComponent).SelectEmptyOption = SelectEmptyOption;

export default Select as SelectComponent;
