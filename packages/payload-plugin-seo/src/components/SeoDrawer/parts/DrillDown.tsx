"use client";

import { ChevronDown, ChevronUp } from "lucide-react";
import { useState } from "react";
import { cn } from "../../../utils/style";

interface DrillDownProps {
  items: { left: string; right: string }[];
  label: string;
}

export function DrillDown({ items, label }: DrillDownProps) {
  const [open, setOpen] = useState(false);

  if (!items.length) return null;

  return (
    <>
      <button type="button" className="drill-btn" onClick={() => setOpen((o) => !o)}>
        {open ? (
          <>
            Hide <ChevronUp size={14} />
          </>
        ) : (
          <>
            {label} <ChevronDown size={14} />
          </>
        )}
      </button>

      <div className={cn("drill", open && "open")}>
        {items.map((it, i) => (
          <div className="it" key={`${it.left}-${i}`}>
            <span>{it.left}</span>

            <span className="val">{it.right}</span>
          </div>
        ))}
      </div>
    </>
  );
}
