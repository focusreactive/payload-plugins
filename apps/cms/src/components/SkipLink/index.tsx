interface SkipLinkProps {
  targetId?: string;
  label?: string;
}

/** First focusable element on every page (WCAG 2.4.1); visible only on keyboard focus. */
export function SkipLink({ targetId = "main", label = "Skip to content" }: SkipLinkProps) {
  return (
    <a
      href={`#${targetId}`}
      className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-md focus:bg-ct-dark-blue focus:px-4 focus:py-3 focus:font-semibold focus:text-ct-white"
    >
      {label}
    </a>
  );
}
