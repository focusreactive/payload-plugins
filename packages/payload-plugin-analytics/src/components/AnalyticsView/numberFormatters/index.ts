export function formatCompactNumber(n: number) {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace(/\.0$/, "") + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1).replace(/\.0$/, "") + "k";

  return String(n);
}

export function formatNumber(n: number) {
  return n.toLocaleString("en-US");
}

export function formatPercentage(p: number) {
  return (p * 100).toFixed(1) + "%";
}

export function formatDuration(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60)
    .toString()
    .padStart(2, "0");

  return `${m}m ${s}s`;
}

export function formatShortDate(iso: string) {
  const d = new Date(iso + "T00:00:00Z");

  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
}
