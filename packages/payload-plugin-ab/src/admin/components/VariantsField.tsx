"use client";

import { useCallback, useEffect, useState } from "react";
import { Button, toast, useDocumentInfo, useField } from "@payloadcms/ui";
import { AB_PASS_PERCENTAGE_FIELD, AB_VARIANT_OF_FIELD, AB_VARIANT_PERCENTAGES_FIELD } from "../../constants";
import { VariantRow } from "./VariantRow";

export interface VariantData {
  id: string;
  title?: string;
  slug?: string;
  passPercentage: number | null;
}

interface VariantsFieldProps {
  slugField?: string;
  titleField?: string;
  collectionSlug?: string; // injected via customComponents clientProps
}

export function VariantsField({
  slugField = "slug",
  titleField = "title",
  collectionSlug: collectionSlugProp,
}: VariantsFieldProps) {
  const { id, collectionSlug: docCollectionSlug } = useDocumentInfo();
  const slug = collectionSlugProp ?? docCollectionSlug;

  const [variants, setVariants] = useState<VariantData[]>([]);

  const { value: pendingPercentages, setValue: setPendingPercentages } = useField<Record<string, number>>({
    path: AB_VARIANT_PERCENTAGES_FIELD,
  });

  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchVariants = useCallback(async () => {
    if (!id || !slug) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/${slug}?where[${AB_VARIANT_OF_FIELD}][equals]=${id}&limit=100&depth=0&draft=true`);
      if (!res.ok) throw new Error("Failed to fetch variants");
      const data = await res.json();
      setVariants(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (data.docs ?? []).map((doc: any) => ({
          id: doc.id,
          title: doc[titleField] ?? doc[slugField] ?? doc.id,
          slug: doc[slugField],
          passPercentage: (doc[AB_PASS_PERCENTAGE_FIELD] as number) ?? 1,
        })),
      );
    } catch {
      // non-fatal
    } finally {
      setLoading(false);
    }
  }, [id, slug, slugField, titleField]);

  useEffect(() => {
    fetchVariants();
  }, [fetchVariants]);

  const handleAddVariant = async () => {
    if (!id || !slug) return;
    setActionLoading(true);
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

      if (pendingPercentages && Object.keys(pendingPercentages).length > 0) {
        const next = { ...pendingPercentages };
        let changed = false;

        for (const v of variants) {
          if (next[v.id] !== undefined) {
            delete next[v.id];
            changed = true;
          }
        }

        if (changed) {
          setPendingPercentages(Object.keys(next).length > 0 ? next : null);
        }
      }

      await fetchVariants();
      toast.success("Variant created");
    } catch {
      toast.error("Failed to create variant");
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteVariant = async (variantId: string) => {
    if (!slug) return;
    setActionLoading(true);
    try {
      const res = await fetch(`/api/${slug}/${variantId}`, { method: "DELETE" });
      if (!res.ok) {
        toast.error("Failed to delete variant");
        return;
      }
      setVariants((prev) => prev.filter((v) => v.id !== variantId));
      if (pendingPercentages?.[variantId] !== undefined) {
        const next = { ...pendingPercentages };
        delete next[variantId];
        setPendingPercentages(Object.keys(next).length > 0 ? next : null);
      }
    } catch {
      toast.error("Failed to delete variant");
    } finally {
      setActionLoading(false);
    }
  };

  const handleClearAll = async () => {
    if (!variants.length || !slug) return;
    if (!window.confirm(`Delete all ${variants.length} variant(s)?`)) return;
    setActionLoading(true);
    try {
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
        deleted.forEach((id) => {
          if (id) delete next[id as string];
        });
        setPendingPercentages(Object.keys(next).length > 0 ? next : null);
      }
      if (failed > 0) toast.error(`${failed} variant(s) failed to delete`);
    } finally {
      setActionLoading(false);
    }
  };

  const sumOthers = (excludeId: string) =>
    variants.filter((v) => v.id !== excludeId).reduce((s, v) => s + (v.passPercentage ?? 0), 0);

  const handlePercentageChange = (variantId: string, rawStr: string) => {
    if (rawStr === "") {
      setVariants((prev) => prev.map((v) => (v.id === variantId ? { ...v, passPercentage: null } : v)));
      return;
    }
    const raw = Number(rawStr);
    if (isNaN(raw)) return;
    const maxAllowed = Math.max(1, 99 - sumOthers(variantId));
    const clamped = Math.min(raw, maxAllowed);
    setVariants((prev) => prev.map((v) => (v.id === variantId ? { ...v, passPercentage: clamped } : v)));
    setPendingPercentages({ ...(pendingPercentages ?? {}), [variantId]: clamped });
  };

  const handlePercentageBlur = (variantId: string) => {
    const variant = variants.find((v) => v.id === variantId);
    if (!variant) return;
    const maxAllowed = Math.max(1, 99 - sumOthers(variantId));
    const lastValid = pendingPercentages?.[variantId] ?? 1;
    const enforced = Math.max(1, Math.min(variant.passPercentage ?? lastValid, maxAllowed));
    if (enforced === variant.passPercentage) return;
    setVariants((prev) => prev.map((v) => (v.id === variantId ? { ...v, passPercentage: enforced } : v)));
    setPendingPercentages({ ...(pendingPercentages ?? {}), [variantId]: enforced });
  };

  if (!id) return null;

  const totalVariantPercent = variants.reduce((sum, v) => sum + (v.passPercentage ?? 0), 0);
  const originalPercent = 100 - totalVariantPercent;

  return (
    <div style={{ marginBottom: 16 }}>
      <div
        style={{
          opacity: actionLoading ? 0.5 : 1,
          pointerEvents: actionLoading ? "none" : "auto",
          transition: "opacity 0.15s",
        }}>
        <div style={{ display: "flex", alignItems: "center", marginBottom: 8 }}>
          <label className="field-label" style={{ paddingBottom: 0, marginRight: 0 }}>
            Variants
          </label>
          {variants.length > 0 && (
            <span
              style={{
                marginLeft: "auto",
                fontSize: 12,
                color: "var(--theme-elevation-500)",
              }}>
              Original: {Math.max(0, originalPercent)}% of traffic
            </span>
          )}
        </div>
        {loading ?
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              minHeight: 60,
              border: "1px solid var(--theme-elevation-150)",
              borderRadius: 4,
              background: "var(--theme-elevation-50)",
            }}>
            <span
              style={{
                width: 16,
                height: 16,
                border: "2px solid var(--theme-elevation-300)",
                borderTopColor: "var(--theme-elevation-800)",
                borderRadius: "50%",
                display: "inline-block",
                animation: "spin 0.7s linear infinite",
              }}
            />
          </div>
        : variants.length === 0 ?
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              minHeight: 60,
              border: "1px solid var(--theme-elevation-150)",
              borderRadius: 4,
              background: "var(--theme-elevation-50)",
            }}>
            <Button onClick={handleAddVariant} buttonStyle="primary" size="medium">
              Add Variant
            </Button>
          </div>
        : <>
            {variants.map((variant) => (
              <VariantRow
                key={variant.id}
                variant={variant}
                collectionSlug={slug!}
                maxPercentage={99 - sumOthers(variant.id)}
                onPercentageChange={(value) => handlePercentageChange(variant.id, value)}
                onPercentageBlur={() => handlePercentageBlur(variant.id)}
                onDelete={() => handleDeleteVariant(variant.id)}
                onSaved={fetchVariants}
              />
            ))}

            <div className="ab-variants-actions" style={{ display: "flex", gap: 8, marginTop: 8 }}>
              <div style={{ flex: 1 }}>
                <Button onClick={handleAddVariant} buttonStyle="primary" size="medium">
                  Add Variant
                </Button>
              </div>
              <div style={{ flex: 1 }}>
                <Button onClick={handleClearAll} buttonStyle="secondary" size="medium">
                  Clear All
                </Button>
              </div>
            </div>
          </>
        }
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        .ab-variants-actions button { width: 100%; }
        .ab-variant-icon-btn {
          display: flex; align-items: center; justify-content: center;
          width: 28px; height: 28px; border-radius: 4px;
          border: 1px solid var(--theme-elevation-150);
          background: var(--theme-elevation-0); color: var(--theme-elevation-500);
          cursor: pointer; transition: background 0.15s, color 0.15s;
          text-decoration: none;
        }
        .icon.icon--trash { flex: none; }
        .ab-variant-icon-btn:hover {
          background: var(--theme-elevation-100); color: var(--theme-elevation-800);
        }
        .ab-variant-icon-btn--danger { color: #dc2626; }
        .ab-variant-icon-btn--danger:hover { background: #fef2f2; color: #b91c1c; }
        .ab-percent-input-wrapper {
          position: relative; display: inline-flex; align-items: center;
        }
        .ab-percent-input {
          width: 64px; padding: 0 24px 0 8px; font-size: 13px; height: 28px;
          border: 1px solid var(--theme-elevation-150); border-radius: 4px;
          background: var(--theme-elevation-0); color: var(--theme-elevation-800);
          -moz-appearance: textfield;
        }
        .ab-percent-input::-webkit-outer-spin-button,
        .ab-percent-input::-webkit-inner-spin-button { -webkit-appearance: none; margin: 0; }
        .ab-percent-suffix {
          position: absolute; right: 8px; font-size: 12px;
          color: var(--theme-elevation-400); pointer-events: none;
        }
      `}</style>
    </div>
  );
}

export default VariantsField;
