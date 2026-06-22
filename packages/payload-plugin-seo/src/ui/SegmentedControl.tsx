"use client";

import { cva } from "class-variance-authority";
import { useRef } from "react";
import type { ReactNode } from "react";

const segmentVariants = cva(
  "inline-flex items-center gap-[5px] px-[11px] py-[4px] rounded-rs text-[11px] font-medium border-0 cursor-pointer",
  {
    variants: {
      active: {
        true: "bg-neutral-0 text-neutral-1000",
        false: "bg-transparent text-neutral-600",
      },
    },
    defaultVariants: { active: false },
  }
);

interface SegmentedControlOption<T extends string> {
  value: T;
  label: string;
  icon?: ReactNode;
}

interface SegmentedControlProps<T extends string> {
  options: SegmentedControlOption<T>[];
  value: T;
  onChange: (value: T) => void;
  label: string;
}

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  label,
}: SegmentedControlProps<T>) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);

  const selectIndex = (index: number) => {
    const next = options[index];
    if (!next) return;

    onChange(next.value);
    refs.current[index]?.focus();
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>, index: number) => {
    const last = options.length - 1;

    switch (event.key) {
      case "ArrowRight":
      case "ArrowDown":
        event.preventDefault();
        selectIndex(index === last ? 0 : index + 1);
        break;
      case "ArrowLeft":
      case "ArrowUp":
        event.preventDefault();
        selectIndex(index === 0 ? last : index - 1);
        break;
      case "Home":
        event.preventDefault();
        selectIndex(0);
        break;
      case "End":
        event.preventDefault();
        selectIndex(last);
        break;
      default:
        break;
    }
  };

  return (
    <div
      role="radiogroup"
      aria-label={label}
      className="inline-flex bg-neutral-100 rounded-rm p-[2px] gap-[2px]"
    >
      {options.map((option, index) => {
        const isActive = option.value === value;

        return (
          <button
            key={option.value}
            ref={(node) => {
              refs.current[index] = node;
            }}
            type="button"
            role="radio"
            aria-checked={isActive}
            tabIndex={isActive ? 0 : -1}
            className={segmentVariants({ active: isActive })}
            onClick={() => selectIndex(index)}
            onKeyDown={(event) => handleKeyDown(event, index)}
          >
            {option.icon}
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
