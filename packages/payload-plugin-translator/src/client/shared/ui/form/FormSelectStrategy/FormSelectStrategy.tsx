import type { ReactElement } from "react";

import { QuestionCircleIcon } from "../../../lib/assets/icons/QuestionCircleIcon";
import Tooltip from "../../Tooltip";
import FormSelect from "../FormSelect";

import styles from "./styles.module.scss";

const STRATEGY_OPTIONS = [
  { label: "Overwrite", value: "overwrite" },
  { label: "Skip existing", value: "skip_existing" },
] as const;

const STRATEGY_LABEL = "Update mode";

const STRATEGY_TOOLTIP = (
  <>
    <strong>Overwrite</strong> — translate all fields, replacing existing values
    <br />
    <strong>Skip existing</strong> — only translate empty fields, keep existing
    values
  </>
);

const StrategyLabel: ReactElement = (
  <span className={styles.label}>
    {STRATEGY_LABEL}
    <Tooltip content={STRATEGY_TOOLTIP} side="bottom">
      <span className={styles.label__icon}>
        <QuestionCircleIcon />
      </span>
    </Tooltip>
  </span>
);

interface FormSelectStrategyProps {
  name: string;
  required?: boolean;
  description?: string;
  disabled?: boolean;
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function FormSelectStrategy({
  name,
  required,
  description,
  disabled,
  size,
  className,
}: FormSelectStrategyProps) {
  return (
    <FormSelect
      size={size}
      className={className}
      description={description}
      label={StrategyLabel}
      required={required}
      name={name}
      options={[...STRATEGY_OPTIONS]}
      disabled={disabled}
    />
  );
}

export type TranslationStrategy = (typeof STRATEGY_OPTIONS)[number]["value"];
