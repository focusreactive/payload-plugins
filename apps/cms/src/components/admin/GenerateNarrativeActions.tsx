"use client";

import {
  Button,
  toast,
  useConfig,
  useDocumentInfo,
  useForm,
  useFormModified,
  useLocale,
} from "@payloadcms/ui";
import { useRouter } from "next/navigation";
import React, { useState } from "react";

type PendingAction = "generate" | "translate" | null;

interface NarrativeResponse {
  narrative?: string;
  title?: string;
  slug?: string;
  generatedAt?: string;
  generationModel?: string;
  generationInputs?: string;
  error?: string;
}

function relationValue(value: unknown): number | string | undefined {
  if (typeof value === "number" || typeof value === "string") return value;
  if (value && typeof value === "object" && "id" in value) {
    return (value as { id: number | string }).id;
  }
  return undefined;
}

/**
 * The two demo buttons on a generated page. "Generate with AI" fills the OPEN
 * form (nothing is saved until the editor saves the draft - the review step is
 * real, not decorative). "Translate to Italian" writes the Italian locale of
 * the narrative as a draft and jumps there for review.
 */
export function GenerateNarrativeActions() {
  const { getDataByPath, dispatchFields, setModified } = useForm();
  const formModified = useFormModified();
  const { id } = useDocumentInfo();
  const locale = useLocale();
  const { config } = useConfig();
  const router = useRouter();
  const [pending, setPending] = useState<PendingAction>(null);

  const apiRoute = config.routes.api;

  const callEndpoint = async (body: Record<string, unknown>): Promise<NarrativeResponse> => {
    const response = await fetch(`${apiRoute}/generated-pages/generate`, {
      body: JSON.stringify(body),
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      method: "POST",
    });
    const data = (await response.json()) as NarrativeResponse;
    if (!response.ok) {
      throw new Error(data.error || `Request failed (${response.status})`);
    }
    return data;
  };

  const handleGenerate = async () => {
    const conditionId = relationValue(getDataByPath("condition"));
    const cityId = relationValue(getDataByPath("city"));

    if (!conditionId || !cityId) {
      toast.error("Pick a condition and a city first");
      return;
    }

    setPending("generate");
    try {
      const data = await callEndpoint({
        cityId,
        conditionId,
        documentId: id ?? undefined,
        mode: "narrative",
      });

      const updates: Array<[string, unknown]> = [
        ["narrative", data.narrative],
        ["title", data.title],
        ["slug", data.slug],
        ["provenance.generatedAt", data.generatedAt],
        ["provenance.generationModel", data.generationModel],
        ["provenance.generationInputs", data.generationInputs],
      ];
      for (const [path, value] of updates) {
        dispatchFields({ type: "UPDATE", path, value });
      }
      setModified(true);
      toast.success("Narrative generated - review it, then save the draft");
    } catch (error) {
      toast.error((error as Error).message || "Generation failed");
    } finally {
      setPending(null);
    }
  };

  const handleTranslate = async () => {
    const narrative = getDataByPath<string>("narrative");
    const title = getDataByPath<string>("title");

    if (!id) {
      toast.error("Save the draft first, then translate");
      return;
    }
    // Translation writes server-side and then navigates to the Italian locale,
    // which would discard unsaved English edits - force a save first.
    if (formModified) {
      toast.error("Save the draft first, then translate");
      return;
    }
    if (!narrative?.trim()) {
      toast.error("Generate the English narrative first");
      return;
    }

    setPending("translate");
    try {
      await callEndpoint({ documentId: id, mode: "translate", narrative, title });
      toast.success("Italian draft saved - switching locale so you can review it");
      router.push(`${window.location.pathname}?locale=it`);
      router.refresh();
    } catch (error) {
      toast.error((error as Error).message || "Translation failed");
    } finally {
      setPending(null);
    }
  };

  if (locale.code !== "en") {
    return (
      <div style={{ marginBottom: "1rem" }}>
        <p style={{ color: "var(--theme-elevation-500)", fontSize: "0.85rem", margin: 0 }}>
          Generation runs on the English locale. The narrative below is the reviewed translation for
          this locale.
        </p>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem", marginBottom: "1rem" }}>
      <Button
        buttonStyle="secondary"
        disabled={pending !== null}
        onClick={handleGenerate}
        size="medium"
      >
        {pending === "generate" ? "Generating..." : "Generate with AI"}
      </Button>
      <Button
        buttonStyle="secondary"
        disabled={pending !== null}
        onClick={handleTranslate}
        size="medium"
      >
        {pending === "translate" ? "Translating..." : "Translate to Italian"}
      </Button>
      <p style={{ color: "var(--theme-elevation-500)", fontSize: "0.8rem", margin: 0 }}>
        Generate fills this form - nothing publishes without review. Translate writes the Italian
        locale as a draft.
      </p>
    </div>
  );
}
