import { AlertCircle, RotateCcw } from "lucide-react";
import { cn } from "../../../utils/style";

function errorToMessage(err: Error) {
  const msg = err.message.toLowerCase();

  if (msg.includes("429") || msg.includes("quota")) return "Analytics quota exceeded. Try again in a few minutes.";
  if (msg.includes("403") || msg.includes("permission")) return "You don't have permission to view this data.";
  if (msg.includes("network") || msg.includes("fetch")) return "Network error. Check your connection and retry.";

  return err.message;
}

export interface ErrorTileProps {
  error: Error;
  onRetry?: () => void;
  className?: string;
}

export function ErrorTile({ error, onRetry, className }: ErrorTileProps) {
  return (
    <div className={cn("flex flex-col items-center justify-center py-6 px-3 text-center gap-2", className)}>
      <AlertCircle size={20} className="text-[var(--theme-error-500)]" />

      <div className="text-sm font-medium text-[var(--theme-elevation-800)]">Couldn&apos;t load this section.</div>
      <div className="text-xs text-[var(--theme-elevation-500)]">{errorToMessage(error)}</div>

      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="inline-flex items-center gap-1.5 mt-1 px-3 py-1.5 border border-[var(--theme-border-color)] rounded-[var(--style-radius-s)] text-xs hover:bg-[var(--theme-elevation-100)]"
        >
          <RotateCcw size={12} />
          Retry
        </button>
      )}
    </div>
  );
}
