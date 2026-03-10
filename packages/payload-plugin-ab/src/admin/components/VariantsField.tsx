"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { useDocumentInfo } from "@payloadcms/ui";
import { AB_PASS_PERCENTAGE_FIELD, AB_VARIANT_OF_FIELD } from "../../constants";

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
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 3000);
  };

  const fetchVariants = useCallback(async () => {
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
          passPercentage: (doc[AB_PASS_PERCENTAGE_FIELD] as number) ?? 0,
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
    try {
      const res = await fetch("/api/_ab/duplicate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ collectionSlug: slug, docId: id, slugField }),
      });
      if (!res.ok) {
        const err = await res.json();
        showToast(`Error: ${err.error ?? "Unknown error"}`);
        return;
      }
      await fetchVariants();
      showToast("Variant created");
    } catch {
      showToast("Failed to create variant");
    }
  };

  const handleDeleteVariant = async (variantId: string) => {
    if (!slug) return;
    try {
      await fetch(`/api/${slug}/${variantId}`, { method: "DELETE" });
      setVariants((prev) => prev.filter((v) => v.id !== variantId));
    } catch {
      showToast("Failed to delete variant");
    }
  };

  const handleClearAll = async () => {
    if (!variants.length || !slug) return;
    if (!window.confirm(`Delete all ${variants.length} variant(s)?`)) return;
    await Promise.all(variants.map((v) => fetch(`/api/${slug}/${v.id}`, { method: "DELETE" })));
    setVariants([]);
  };

  const handlePercentageBlur = async (variantId: string, value: number) => {
    if (!slug) return;
    const clamped = Math.min(100, Math.max(0, value));
    try {
      await fetch(`/api/${slug}/${variantId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [AB_PASS_PERCENTAGE_FIELD]: clamped }),
      });
      setVariants((prev) =>
        prev.map((v) => (v.id === variantId ? { ...v, passPercentage: clamped } : v)),
      );
    } catch {
      showToast("Failed to update percentage");
    }
  };

  if (!id) return null;

  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <label style={{ fontWeight: 600, fontSize: 14 }}>Variants</label>
        {variants.length > 0 && (
          <button
            type="button"
            onClick={handleClearAll}
            style={{ background: "none", border: "none", cursor: "pointer", fontSize: 13, color: "#666" }}
          >
            Clear All
          </button>
        )}
      </div>

      {loading && <div style={{ fontSize: 13, color: "#888" }}>Loading…</div>}

      {variants.map((variant) => (
        <div
          key={variant.id}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "8px 12px",
            border: "1px solid #e0e0e0",
            borderRadius: 4,
            marginBottom: 6,
            background: "#fafafa",
          }}
        >
          <span style={{ flex: 1, fontSize: 14 }}>{variant.title}</span>
          <input
            type="number"
            min={0}
            max={100}
            defaultValue={variant.passPercentage}
            onBlur={(e) => handlePercentageBlur(variant.id, Number(e.target.value))}
            style={{ width: 60, padding: "2px 6px", fontSize: 13, border: "1px solid #ccc", borderRadius: 3 }}
            title="Traffic percentage (0–100)"
          />
          <span style={{ fontSize: 11, color: "#888" }}>%</span>
          <a
            href={`/admin/collections/${slug}/${variant.id}`}
            target="_blank"
            rel="noreferrer"
            style={{ color: "#555", display: "flex", alignItems: "center" }}
            title="Edit variant"
          >
            ↗
          </a>
          <button
            type="button"
            onClick={() => handleDeleteVariant(variant.id)}
            style={{ background: "none", border: "none", cursor: "pointer", color: "#888", fontSize: 16, lineHeight: 1 }}
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
            fontSize: 14,
            color: "#333",
            padding: 0,
          }}
        >
          <span style={{ fontSize: 18, lineHeight: 1 }}>+</span> Add new
        </button>
      </div>

      {toast && (
        <div
          style={{
            marginTop: 8,
            padding: "8px 12px",
            background: "#e8f4fd",
            borderRadius: 4,
            fontSize: 13,
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <span>✓</span> {toast}
        </div>
      )}
    </div>
  );
}

export default VariantsField;
