import classNames from "classnames";
import * as React from "react";

import styles from "./styles.module.scss";

interface DividerProps {
  $orientation?: "horizontal" | "vertical";
  $size?: "sm" | "md" | "lg";
  $color?: "light" | "medium" | "dark";
  className?: string;
  style?: React.CSSProperties;
}

const Divider = React.forwardRef<HTMLHRElement, DividerProps>(function Divider(
  {
    $orientation = "horizontal",
    $size = "md",
    $color = "medium",
    className,
    style,
    ...props
  },
  ref
) {
  return (
    <hr
      ref={ref}
      className={classNames(
        styles.divider,
        styles[$orientation],
        styles[$size],
        styles[$color],
        className
      )}
      style={style}
      role="separator"
      aria-orientation={$orientation}
      {...props}
    />
  );
});

export default Divider;
