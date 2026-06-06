"use client";

import type { VitalsResult } from "../../../engine/types";
import { KpiCard } from "../parts/KpiCard";

export function VitalsTab({ data }: { data: VitalsResult }) {
  const max = Math.max(1, ...data.prominentWords.map((w) => w.count));

  return (
    <section className="panel on">
      <div className="gridA">
        <KpiCard label="Words" value={data.words.toLocaleString()} />
        <KpiCard label="Sentences" value={data.sentences} />
        <KpiCard label="Paragraphs" value={data.paragraphs} />
        <KpiCard label="Images" value={data.images} />
        <KpiCard label="Videos" value={data.videos} />
        <KpiCard label="Reading time" value={data.readingTimeMinutes} suffix="min" />
      </div>

      <div className="blocktitle">Prominent words</div>
      <div className="section">
        <div className="sec-head">
          <span className="ttl">Prominent words</span>
          <span className="cnt">{data.prominentWords.length}</span>
        </div>

        {data.prominentWords.map((w) => (
          <div className="wrow" key={w.word}>
            <div className="w">
              {w.word} {w.isKeyphrase && <span className="keypill">Key</span>}
            </div>
            <div className="wbar">
              <i className={w.isKeyphrase ? "key" : ""} style={{ width: `${(w.count / max) * 100}%` }} />
            </div>
            <div className="wct">{w.count}</div>
          </div>
        ))}
      </div>

      <div className="blocktitle">Internal-linking suggestions</div>
      <div className="section">
        <div className="sec-head">
          <span className="ttl">Suggested anchor phrases</span>
          <span className="cnt">{data.internalLinkingPhrases.length}</span>
        </div>
        {data.internalLinkingPhrases.map((p) => (
          <div className="lrow" key={p}>
            <span className="phrase">{p}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
