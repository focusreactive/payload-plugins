import type { ReactNode } from "react";

import Button from "../../../../shared/ui/Button";
import Tooltip from "../../../../shared/ui/Tooltip";

import styles from "./styles.module.scss";

/**
 * A row action shared by the document and collection status lists: a bordered, neutral icon button
 * + tooltip. One source of truth so both popovers' actions look identical. The icon gives the
 * affordance; the tooltip carries the explanation (a bare label can't say "hide until the source
 * changes again").
 */
export function ActionButton({
  icon,
  title,
  onClick,
  disabled,
  loading,
}: {
  icon: ReactNode;
  title: string;
  onClick: () => void;
  disabled?: boolean;
  loading?: boolean;
}) {
  return (
    <Tooltip content={title}>
      <Button
        type="button"
        $variant="transparent"
        $size="sm"
        $isIconButton
        className={styles.action}
        aria-label={title}
        onClick={onClick}
        disabled={disabled}
        $isLoading={loading}
      >
        {icon}
      </Button>
    </Tooltip>
  );
}
