"use client";

import type { Finding } from "../features/insights/types.js";

export type StatsState =
  | { status: "idle" }
  | { status: "loading" }
  | { message: string; status: "error" }
  | { status: "ready" };

interface InsightsPanelProps {
  activeId: string | null;
  findings: Finding[];
  onActivate: (id: string | null) => void;
  onClose: () => void;
  onLoadData: () => void;
  stats: StatsState;
}

/** Finding texts mark field paths and slugs with backticks; show them as code. */
const withCode = (text: string) =>
  text.split("`").map((part, index) =>
    // oxlint-disable-next-line no-array-index-key -- static text fragments, never reordered
    index % 2 === 1 ? <code key={index}>{part}</code> : part
  );

const SECTIONS = [
  { label: "Warnings", severity: "warning" },
  { label: "Worth a look", severity: "info" },
] as const;

export const InsightsPanel = ({
  activeId,
  findings,
  onActivate,
  onClose,
  onLoadData,
  stats,
}: InsightsPanelProps) => (
  <aside aria-label="Insights" className="rg__panel rg__insights">
    <div className="rg__panel-head">
      <h3>Insights</h3>
      <button aria-label="Close insights" className="rg__icon-btn" onClick={onClose} type="button">
        ×
      </button>
    </div>
    <p className="rg__muted rg__insights-intro">Click a finding to highlight it on the graph.</p>

    {stats.status === "ready" ? null : (
      <div className="rg__callout">
        {stats.status === "loading" ? (
          <span>Checking live data…</span>
        ) : (
          <>
            <span>
              {stats.status === "error"
                ? `Live data could not be loaded: ${stats.message}`
                : "Add findings from the actual content: unreferenced files, empty or unused relations."}
            </span>
            <button className="rg__btn rg__btn--small" onClick={onLoadData} type="button">
              {stats.status === "error" ? "Retry" : "Check live data"}
            </button>
          </>
        )}
      </div>
    )}

    {findings.length === 0 ? <p className="rg__muted">Nothing to report.</p> : null}

    {SECTIONS.map(({ label, severity }) => {
      const items = findings.filter((finding) => finding.severity === severity);
      if (items.length === 0) {
        return null;
      }
      return (
        <section key={severity}>
          <h4>
            {label} ({items.length})
          </h4>
          <ul className="rg__findings">
            {items.map((finding) => {
              const active = finding.id === activeId;
              return (
                <li key={finding.id}>
                  <button
                    aria-expanded={active}
                    className={`rg__finding rg__finding--${finding.severity}${active ? " rg__finding--active" : ""}`}
                    onClick={() => onActivate(active ? null : finding.id)}
                    type="button"
                  >
                    <span className="rg__finding-title">{withCode(finding.title)}</span>
                    {finding.source === "data" ? (
                      <span className="rg__finding-tag">live data</span>
                    ) : null}
                    {active ? (
                      <span className="rg__finding-detail">{withCode(finding.detail)}</span>
                    ) : null}
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      );
    })}
  </aside>
);
