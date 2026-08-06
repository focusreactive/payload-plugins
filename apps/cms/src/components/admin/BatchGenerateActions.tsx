"use client";

import { Button, toast, useConfig, useDocumentInfo } from "@payloadcms/ui";
import { useRouter } from "next/navigation";
import React, { useState } from "react";

type ItemStatus = "created" | "retried" | "failed";

interface ResultRow {
  slug: string;
  status: ItemStatus;
  wordCount?: number;
  attempts?: number;
  reason?: string;
}

interface BatchPlan {
  anchor: string;
  existing: number;
  total: number;
}

interface BatchSummary {
  created: number;
  retried: number;
  failed: number;
}

const STATUS_LABEL: Record<ItemStatus, string> = {
  created: "draft created",
  failed: "failed, not created",
  retried: "short, retried, draft created",
};

const STATUS_COLOR: Record<ItemStatus, string> = {
  created: "var(--theme-success-500)",
  failed: "var(--theme-error-500)",
  retried: "var(--theme-warning-500)",
};

/**
 * Runs a batch of generated pages for the open city or condition and shows the
 * result of every single one.
 *
 * The client's objection was never that a batch is hard to trigger - their own
 * pipeline already does that - it was "if we create a thousand pages nobody
 * checks them one by one, so it should be managed by the system by design".
 * The per-item table is therefore the feature, not decoration: it is the only
 * thing on screen that proves the run enforced a standard rather than writing
 * whatever the model returned.
 */
export function BatchGenerateActions({ axis }: { axis: "city" | "condition" }) {
  const { id } = useDocumentInfo();
  const { config } = useConfig();
  const router = useRouter();
  const [running, setRunning] = useState(false);
  const [plan, setPlan] = useState<BatchPlan | null>(null);
  const [rows, setRows] = useState<ResultRow[]>([]);
  const [summary, setSummary] = useState<BatchSummary | null>(null);

  const counterpartWord = axis === "city" ? "condition" : "city";

  const handleRun = async () => {
    if (!id) {
      toast.error("Save this record first, then generate its pages");
      return;
    }

    setRunning(true);
    setPlan(null);
    setRows([]);
    setSummary(null);

    try {
      const response = await fetch(`${config.routes.api}/generated-pages/batch`, {
        body: JSON.stringify({ axis, entityId: id }),
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        method: "POST",
      });

      if (!response.ok) {
        const failure = (await response.json()) as { error?: string };
        throw new Error(failure.error || `Request failed (${response.status})`);
      }
      if (!response.body) {
        throw new Error("The server sent no results");
      }

      // Results arrive as NDJSON, one line per finished page, so the table
      // fills in while the run is still going. A whole batch buffered until the
      // end would look frozen for the minute or more it takes.
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.trim()) continue;
          const event = JSON.parse(line) as Record<string, unknown>;

          if (event.type === "plan") {
            setPlan(event as unknown as BatchPlan);
          } else if (event.type === "item") {
            setRows((current) => [...current, event as unknown as ResultRow]);
          } else if (event.type === "summary") {
            setSummary(event as unknown as BatchSummary);
          } else if (event.type === "error") {
            throw new Error(String(event.message ?? "Batch failed"));
          }
        }
      }

      // The new drafts are rows in another collection, so nothing on this
      // screen would show them without a refresh.
      router.refresh();
    } catch (error) {
      toast.error((error as Error).message || "Batch generation failed");
    } finally {
      setRunning(false);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", marginTop: "1rem" }}>
      <Button buttonStyle="secondary" disabled={running} onClick={handleRun} size="medium">
        {running ? "Generating..." : "Generate the missing pages"}
      </Button>

      <p style={{ color: "var(--theme-elevation-500)", fontSize: "0.8rem", margin: 0 }}>
        One page per {counterpartWord} that does not have one yet. Every page is checked before it
        is kept, and each one lands as a draft for review.
      </p>

      {plan && (
        <p style={{ fontSize: "0.85rem", margin: "0.25rem 0 0" }}>
          <strong>{plan.anchor}</strong>: {plan.existing} already had a page, {plan.total} to
          generate.
        </p>
      )}

      {rows.length > 0 && (
        <table style={{ borderCollapse: "collapse", fontSize: "0.8rem", width: "100%" }}>
          <tbody>
            {rows.map((row) => (
              <tr key={row.slug}>
                <td
                  style={{
                    borderBottom: "1px solid var(--theme-elevation-100)",
                    padding: "0.3rem 0.5rem 0.3rem 0",
                  }}
                >
                  {row.slug}
                </td>
                <td
                  style={{
                    borderBottom: "1px solid var(--theme-elevation-100)",
                    color: "var(--theme-elevation-500)",
                    padding: "0.3rem 0.5rem",
                    whiteSpace: "nowrap",
                  }}
                >
                  {row.wordCount ? `${row.wordCount} words` : ""}
                </td>
                <td
                  style={{
                    borderBottom: "1px solid var(--theme-elevation-100)",
                    color: STATUS_COLOR[row.status],
                    padding: "0.3rem 0",
                  }}
                >
                  {STATUS_LABEL[row.status]}
                  {row.status === "failed" && row.reason ? `: ${row.reason}` : ""}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {summary && (
        <p style={{ fontSize: "0.85rem", margin: "0.25rem 0 0" }}>
          <strong>
            {summary.created} drafts created, {summary.failed} failed
            {summary.retried > 0 ? `, ${summary.retried} needed a second attempt` : ""}.
          </strong>{" "}
          Nothing was published - open &quot;Generated Pages&quot; to review them.
        </p>
      )}
    </div>
  );
}

export function BatchGenerateForCity() {
  return <BatchGenerateActions axis="city" />;
}

export function BatchGenerateForCondition() {
  return <BatchGenerateActions axis="condition" />;
}
