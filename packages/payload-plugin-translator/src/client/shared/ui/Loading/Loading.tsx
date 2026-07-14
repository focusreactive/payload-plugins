import classNames from "classnames";

import { getBarCount } from "./barCount";
import type { LoadingSize } from "./barCount";
import styles from "./styles.module.scss";

type LoadingProps = {
  text?: string;
  className?: string;
  /** Matches the host control's size; drives how many bars animate (sm → fewer, so it stays legible). */
  size?: LoadingSize;
  /** For square/narrow hosts (icon buttons): use the minimum bar count so they fit the width. */
  compact?: boolean;
};

function Loading({ text, className, size = "md", compact }: LoadingProps) {
  const barCount = getBarCount(size, compact);
  return (
    <div
      className={classNames(
        styles["loading-overlay"],
        styles["loading-overlay--entering"],
        className
      )}
      style={{ animationDuration: "500ms" }}
    >
      <div
        className={classNames(
          styles["loading-overlay__bars"],
          styles[`loading-overlay__bars_${size}`]
        )}
      >
        {new Array(barCount).fill(null).map((_, index) => (
          <div
            key={index}
            className={classNames(
              styles["loading-overlay__bar"],
              styles[`loading-overlay__bar_size-${size}`]
            )}
          />
        ))}
      </div>
      {text && <span className={styles["loading-overlay__text"]}>{text}</span>}
    </div>
  );
}

export default Loading;
