"use client";

interface CountPillProps {
  count: number;
}

export function CountPill({ count }: CountPillProps) {
  return <span className="font-mono text-[11px] text-neutral-500 bg-neutral-100 rounded-[20px] px-[9px] py-[2px]">{count}</span>;
}
