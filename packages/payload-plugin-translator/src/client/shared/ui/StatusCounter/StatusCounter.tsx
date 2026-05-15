import classNames from "classnames";

import StatusIndicator from "../StatusIndicator";

import styles from "./styles.module.scss";

interface StatusCounterProps {
  status: "pending" | "running" | "completed" | "failed";
  count: number;
  label?: string;
  animated?: boolean;
  size?: "small" | "medium";
  className?: string;
}

const statusColorMap = {
  completed: "green" as const,
  failed: "red" as const,
  pending: "gray" as const,
  running: "blue" as const,
};

const statusLabelMap = {
  completed: "Завершено",
  failed: "Ошибки",
  pending: "В очереди",
  running: "В процессе",
};

export default function StatusCounter({
  status,
  count,
  label,
  animated = false,
  size = "medium",
  className,
}: StatusCounterProps) {
  const displayLabel = label || statusLabelMap[status];
  const color = statusColorMap[status];

  return (
    <div className={classNames(styles.container, styles[size], className)}>
      <StatusIndicator
        $color={color}
        $animated={animated && status === "running"}
        className={styles.indicator}
      />
      <div className={styles.content}>
        <span className={styles.count}>{count}</span>
        <span className={styles.label}>{displayLabel}</span>
      </div>
    </div>
  );
}
