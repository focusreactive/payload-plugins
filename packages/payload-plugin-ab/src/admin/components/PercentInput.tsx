import { useEffect, useState } from "react";

interface PercentInputProps {
  value: number;
  min: number;
  max: number;
  label: string;
  onChange: (value: number) => void;
}

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

/**
 * Compact percent stepper: type a number, use −/+ or the arrow keys
 * (Shift = ±10, PageUp/PageDown = ±10, Home/End = min/max).
 * Typed text is committed on blur or Enter so partial input never fights the user.
 */
export function PercentInput({ value, min, max, label, onChange }: PercentInputProps) {
  const [draft, setDraft] = useState(String(value));

  useEffect(() => setDraft(String(value)), [value]);

  const commit = (next: number) => {
    const clamped = clamp(Math.round(next), min, max);
    setDraft(String(clamped));
    if (clamped !== value) onChange(clamped);
  };

  const commitDraft = () => {
    const parsed = Number.parseInt(draft, 10);
    if (Number.isNaN(parsed)) setDraft(String(value));
    else commit(parsed);
  };

  const onKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    const big = event.shiftKey ? 10 : 1;
    const steps: Record<string, number> = {
      ArrowUp: big,
      ArrowDown: -big,
      PageUp: 10,
      PageDown: -10,
    };
    if (event.key in steps) {
      event.preventDefault();
      commit(value + (steps[event.key] ?? 0));
    } else if (event.key === "Home") {
      event.preventDefault();
      commit(min);
    } else if (event.key === "End") {
      event.preventDefault();
      commit(max);
    } else if (event.key === "Enter") {
      event.preventDefault();
      commitDraft();
    } else if (event.key === "Escape") {
      setDraft(String(value));
    }
  };

  return (
    <div className="ab-percent__group">
      <button
        type="button"
        className="ab-percent__step"
        tabIndex={-1}
        disabled={value <= min}
        aria-label={`Less traffic to ${label}`}
        onClick={() => commit(value - 1)}
      >
        −
      </button>
      <input
        className="ab-percent__input"
        type="text"
        inputMode="numeric"
        role="spinbutton"
        aria-label={`Traffic to ${label}, percent`}
        aria-valuenow={value}
        aria-valuemin={min}
        aria-valuemax={max}
        aria-valuetext={`${value}%`}
        value={draft}
        onChange={(event) => setDraft(event.target.value.replaceAll(/\D/gu, "").slice(0, 3))}
        onBlur={commitDraft}
        onKeyDown={onKeyDown}
        onFocus={(event) => event.target.select()}
      />
      <span className="ab-percent__unit" aria-hidden="true">
        %
      </span>
      <button
        type="button"
        className="ab-percent__step"
        tabIndex={-1}
        disabled={value >= max}
        aria-label={`More traffic to ${label}`}
        onClick={() => commit(value + 1)}
      >
        +
      </button>
    </div>
  );
}
