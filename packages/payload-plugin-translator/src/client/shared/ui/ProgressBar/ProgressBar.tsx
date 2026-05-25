import classNames from "classnames";

import styles from "./styles.module.scss";

interface ProgressBarProps {
  percentage: number;
  size?: "small" | "medium" | "large";
  color?: "blue" | "green" | "red" | "gray";
  showPercentage?: boolean;
  className?: string;
}

export default function ProgressBar({
  percentage,
  size = "medium",
  color = "blue",
  showPercentage = true,
  className,
}: ProgressBarProps) {
  const clampedPercentage = Math.max(0, Math.min(100, percentage));

  return (
    <div className={classNames(styles.container, className)}>
      <div className={classNames(styles.track, styles[size])}>
        <div
          className={classNames(styles.fill, styles[`${color}-fill`])}
          style={{ width: `${clampedPercentage}%` }}
        />
      </div>
      {showPercentage && (
        <span className={classNames(styles.label, styles[`${size}-label`])}>
          {Math.round(clampedPercentage)}%
        </span>
      )}
    </div>
  );
}
