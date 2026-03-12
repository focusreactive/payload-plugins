"use client";

import React, { useCallback, useEffect, useState } from "react";
import { Button, toast, useDocumentInfo, useField } from "@payloadcms/ui";
import { AB_PASS_PERCENTAGE_FIELD, AB_VARIANT_OF_FIELD, AB_VARIANT_PERCENTAGES_FIELD } from "../../constants";

interface VariantRow {
  id: string;
  title?: string;
  slug?: string;
  passPercentage: number;
}

interface VariantsFieldProps {
  slugField?: string;
  titleField?: string;
  collectionSlug?: string; // injected via customComponents clientProps
}

export function VariantsField({ slugField = "slug", titleField = "title", collectionSlug: collectionSlugProp }: VariantsFieldProps) {
  const { id, collectionSlug: docCollectionSlug } = useDocumentInfo();
  const slug = collectionSlugProp ?? docCollectionSlug;

  const [variants, setVariants] = useState<VariantRow[]>([]);

  const { value: pendingPercentages, setValue: setPendingPercentages } =
    useField<Record<string, number>>({ path: AB_VARIANT_PERCENTAGES_FIELD });

  const [loading, setLoading] = useState(true);

  const fetchVariants = useCallback(
    async (initialPending?: Record<string, number> | null) => {
      if (!id || !slug) return;
      setLoading(true);
      try {
        const res = await fetch(
          `/api/${slug}?where[${AB_VARIANT_OF_FIELD}][equals]=${id}&limit=100&depth=0`,
        );
        if (!res.ok) throw new Error("Failed to fetch variants");
        const data = await res.json();
        setVariants(
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (data.docs ?? []).map((doc: any) => ({
            id: doc.id,
            title: doc[titleField] ?? doc[slugField] ?? doc.id,
            slug: doc[slugField],
            passPercentage: initialPending?.[doc.id] ?? (doc[AB_PASS_PERCENTAGE_FIELD] as number) ?? 1,
          })),
        );
      } catch {
        // non-fatal
      } finally {
        setLoading(false);
      }
    },
    [id, slug, slugField, titleField],
  );

  useEffect(() => {
    fetchVariants(pendingPercentages);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchVariants]);

  const handleAddVariant = async () => {
    if (!id || !slug) return;
    try {
      const res = await fetch("/api/_ab/duplicate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ collectionSlug: slug, docId: id, slugField }),
      });
      const body = await res.json();
      if (!res.ok) {
        toast.error(`Error: ${body.error ?? "Unknown error"}`);
        return;
      }
      const newPending = { ...(pendingPercentages ?? {}), [body.id]: 1 };
      setPendingPercentages(newPending);
      await fetchVariants(newPending);
      toast.success("Variant created");
    } catch {
      toast.error("Failed to create variant");
    }
  };

  const handleDeleteVariant = async (variantId: string) => {
    if (!slug) return;
    try {
      const res = await fetch(`/api/${slug}/${variantId}`, { method: "DELETE" });
      if (!res.ok) { toast.error("Failed to delete variant"); return; }
      setVariants((prev) => prev.filter((v) => v.id !== variantId));
      if (pendingPercentages?.[variantId] !== undefined) {
        const next = { ...pendingPercentages };
        delete next[variantId];
        setPendingPercentages(Object.keys(next).length > 0 ? next : null);
      }
    } catch {
      toast.error("Failed to delete variant");
    }
  };

  const handleClearAll = async () => {
    if (!variants.length || !slug) return;
    if (!window.confirm(`Delete all ${variants.length} variant(s)?`)) return;
    const results = await Promise.all(
      variants.map(async (v) => {
        const res = await fetch(`/api/${slug}/${v.id}`, { method: "DELETE" });
        return res.ok ? v.id : null;
      }),
    );
    const deleted = new Set(results.filter(Boolean));
    const failed = variants.length - deleted.size;
    setVariants((prev) => prev.filter((v) => !deleted.has(v.id)));
    if (deleted.size > 0 && pendingPercentages) {
      const next = { ...pendingPercentages };
      deleted.forEach((id) => { if (id) delete next[id as string]; });
      setPendingPercentages(Object.keys(next).length > 0 ? next : null);
    }
    if (failed > 0) toast.error(`${failed} variant(s) failed to delete`);
  };

  const sumOthers = (excludeId: string) =>
    variants.filter((v) => v.id !== excludeId).reduce((s, v) => s + v.passPercentage, 0);

  const handlePercentageChange = (variantId: string, raw: number) => {
    if (isNaN(raw)) return;
    const maxAllowed = Math.max(1, 99 - sumOthers(variantId));
    const clamped = Math.min(raw, maxAllowed);
    setVariants((prev) =>
      prev.map((v) => (v.id === variantId ? { ...v, passPercentage: clamped } : v)),
    );
    setPendingPercentages({ ...(pendingPercentages ?? {}), [variantId]: clamped });
  };

  const handlePercentageBlur = (variantId: string) => {
    const variant = variants.find((v) => v.id === variantId);
    if (!variant) return;
    const maxAllowed = Math.max(1, 99 - sumOthers(variantId));
    const enforced = Math.max(1, Math.min(variant.passPercentage, maxAllowed));
    if (enforced === variant.passPercentage) return;
    setVariants((prev) =>
      prev.map((v) => (v.id === variantId ? { ...v, passPercentage: enforced } : v)),
    );
    setPendingPercentages({ ...(pendingPercentages ?? {}), [variantId]: enforced });
  };

  if (!id) return null;

  const totalVariantPercent = variants.reduce((sum, v) => sum + v.passPercentage, 0);
  const originalPercent = 100 - totalVariantPercent;

  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ display: "flex", alignItems: "center", marginBottom: 8 }}>
        <label className="field-label" style={{ paddingBottom: 0, marginRight: 0 }}>Variants</label>
        {variants.length > 0 && (
          <button
            type="button"
            onClick={handleClearAll}
            style={{
              marginLeft: "auto",
              background: "none",
              border: "none",
              cursor: "pointer",
              padding: 0,
              font: "inherit",
              fontSize: "inherit",
              color: "var(--theme-elevation-800)",
              textDecoration: "underline",
            }}
          >
            Clear All
          </button>
        )}
      </div>

      {loading ? (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            minHeight: 60,
            border: "1px solid var(--theme-elevation-150)",
            borderRadius: 4,
            background: "var(--theme-elevation-50)",
          }}
        >
          <span style={{ width: 16, height: 16, border: "2px solid var(--theme-elevation-300)", borderTopColor: "var(--theme-elevation-800)", borderRadius: "50%", display: "inline-block", animation: "spin 0.7s linear infinite" }} />
        </div>
      ) : variants.length === 0 ? (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            minHeight: 60,
            border: "1px solid var(--theme-elevation-150)",
            borderRadius: 4,
            background: "var(--theme-elevation-50)",
          }}
        >
          <Button onClick={handleAddVariant} buttonStyle="primary" size="medium">
            Add Variant
          </Button>
        </div>
      ) : (
        <>
          {variants.map((variant) => (
            <div
              key={variant.id}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "8px 12px",
                border: "1px solid var(--theme-elevation-150)",
                borderRadius: 4,
                marginBottom: 6,
                background: "var(--theme-elevation-50)",
              }}
            >
              <span style={{ flex: 1, fontSize: 13, color: "var(--theme-elevation-800)" }}>{variant.title}</span>
              <input
                type="number"
                min={1}
                max={99 - sumOthers(variant.id)}
                value={variant.passPercentage}
                onChange={(e) => handlePercentageChange(variant.id, Number(e.target.value))}
                onBlur={() => handlePercentageBlur(variant.id)}
                style={{ width: 60, padding: "2px 6px", fontSize: 13, border: "1px solid var(--theme-elevation-150)", borderRadius: 3, background: "var(--theme-elevation-0)", color: "var(--theme-elevation-800)" }}
                title="Traffic percentage (1–99)"
              />
              <span style={{ fontSize: 11, color: "var(--theme-elevation-500)" }}>%</span>
              <a
                href={`/admin/collections/${slug}/${variant.id}`}
                target="_blank"
                rel="noreferrer"
                style={{ color: "var(--theme-elevation-500)", display: "flex", alignItems: "center", fontSize: 14 }}
                title="Edit variant"
              >
                ↗
              </a>
              <button
                type="button"
                onClick={() => handleDeleteVariant(variant.id)}
                style={{ background: "none", border: "none", cursor: "pointer", color: "var(--theme-elevation-500)", fontSize: 16, lineHeight: 1, padding: 0 }}
                title="Remove variant"
              >
                ×
              </button>
            </div>
          ))}

          <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 4 }}>
            <button
              type="button"
              onClick={handleAddVariant}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 4,
                background: "none",
                border: "none",
                cursor: "pointer",
                fontSize: 13,
                color: "var(--theme-elevation-800)",
                padding: 0,
              }}
            >
              <span style={{ fontSize: 18, lineHeight: 1 }}>+</span> Add new
            </button>
          </div>
          <p
            style={{
              margin: "8px 0 0",
              fontSize: 12,
              color: "var(--theme-elevation-500)",
            }}
          >
            Original: {Math.max(0, originalPercent)}% of traffic
          </p>
        </>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

export default VariantsField;
