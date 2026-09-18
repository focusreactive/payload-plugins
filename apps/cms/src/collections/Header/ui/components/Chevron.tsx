interface ChevronProps {
  className?: string;
}

export function Chevron({ className }: ChevronProps) {
  return (
    <svg
      aria-hidden
      width="10"
      height="6"
      viewBox="0 0 10 6"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M1 1l4 4 4-4" />
    </svg>
  );
}
