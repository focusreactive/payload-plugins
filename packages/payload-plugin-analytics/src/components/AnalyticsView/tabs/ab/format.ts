import { AB_CONTROL_BUCKET } from "../../../../constants/ab";

const BUCKET_VARS = ["var(--ab-bucket-1)", "var(--ab-bucket-2)", "var(--ab-bucket-3)"];

export function getBucketColor(index: number): string {
  if (index === 0) return "var(--ab-bucket-0)";

  return BUCKET_VARS[(index - 1) % BUCKET_VARS.length]!;
}

export function getBucketLabel(bucket: string, name: string | null): string {
  if (bucket === AB_CONTROL_BUCKET) return "Control";

  return name && name.trim() ? name : bucket;
}

export function formatPercent(x: number, digits = 1): string {
  return `${(x * 100).toFixed(digits)}%`;
}

export function formatSignedPercent(x: number, digits = 1): string {
  return `${x >= 0 ? "+" : ""}${(x * 100).toFixed(digits)}%`;
}

export function formatPValue(pValue: number): string {
  return pValue < 0.001 ? "<0.001" : pValue.toFixed(3);
}

export function formatDayShort(iso: string): string {
  const d = new Date(iso);

  if (Number.isNaN(d.getTime())) return iso;

  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
}

export function formatRelativeTime(iso: string | null): string {
  if (!iso) return "—";

  const then = new Date(iso);
  if (Number.isNaN(then.getTime())) return "—";

  const mins = Math.round((Date.now() - then.getTime()) / 60000);
  if (mins < 60) return `${Math.max(1, mins)}m ago`;

  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;

  return `${Math.round(hrs / 24)}d ago`;
}
