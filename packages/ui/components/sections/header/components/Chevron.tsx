interface ChevronProps {
  className?: string;
}

export function Chevron({ className }: ChevronProps) {
  return (
    <svg aria-hidden width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" className={className}>
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}
