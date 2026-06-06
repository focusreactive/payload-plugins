"use client";

import { ScoreRing } from "../parts/ScoreRing";
import { StatusPill } from "../parts/StatusPill";
import type { AnalysisResult } from "../../../engine/types";

export function InclusiveTab({ data }: { data: AnalysisResult["inclusive"] }) {
  const flagged = data.categories.reduce((n, c) => n + c.flags.length, 0);

  return (
    <section className="panel on">
      <div className="sumA">
        <ScoreRing score={data.ringScore} status={data.status} />
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <b style={{ fontSize: 14 }}>Inclusive language</b>
            <StatusPill status={data.status}>{data.status === "good" ? "Good" : "Needs work"}</StatusPill>
          </div>
          <div className="seo-muted" style={{ fontSize: 11.5, marginTop: 4 }}>
            {flagged} phrases flagged across {data.categories.length} categories
          </div>
        </div>
      </div>

      {data.categories.length > 0 && (
        <div className="section">
          <div className="sec-head">
            <span className="ttl">Marked by category</span>
            <span className="cnt">{flagged}</span>
          </div>
          {data.categories.map((cat) => (
            <div className="cat" key={cat.name}>
              <div className="cat-head">
                <span className="name">{cat.name}</span>
                <span className="num">{cat.flags.length}</span>
              </div>
              {cat.flags.map((f, i) => (
                <div className="frow" key={`${f.term}-${i}`}>
                  <span className="term">{f.term}</span>
                  <span className="chev">›</span>
                  <span className="sugg">{f.suggestion}</span>
                  <span className="loc">{f.location}</span>
                </div>
              ))}
            </div>
          ))}
        </div>
      )}

      {data.cleanCategories.length > 0 && (
        <div className="section">
          <div className="sec-head">
            <span className="ttl">No issues found</span>
            <span className="cnt">{data.cleanCategories.length}</span>
          </div>
          <div className="nichips">
            {data.cleanCategories.map((n) => (
              <span className="nichip" key={n}>
                ✓ {n}
              </span>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
