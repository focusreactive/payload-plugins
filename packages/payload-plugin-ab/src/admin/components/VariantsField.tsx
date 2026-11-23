"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Button,
  ConfirmationModal,
  Pill,
  toast,
  useDocumentInfo,
  useField,
  useModal,
} from "@payloadcms/ui";
import {
  AB_MAX_VARIANT_TOTAL,
  AB_PASS_PERCENTAGE_FIELD,
  AB_PENDING_PERCENTAGES_FIELD,
  AB_VARIANT_OF_FIELD,
} from "../../constants";
import { SplitBar } from "./SplitBar";
import { VariantRow } from "./VariantRow";
import "./VariantsField.css";

export interface VariantData {
  id: string;
  title?: string;
  slug?: string;
  passPercentage: number;
}

interface VariantsFieldProps {
  slugField?: string;
  titleField?: string;
  collectionSlug?: string;
}

const STOP_TEST_MODAL = "ab-stop-test";

export function VariantsField({
  slugField = "slug",
  titleField = "title",
  collectionSlug: collectionSlugProp,
}: VariantsFieldProps) {
  const { id, collectionSlug: docCollectionSlug } = useDocumentInfo();
  const slug = collectionSlugProp ?? docCollectionSlug;
  const { openModal } = useModal();

  const [variants, setVariants] = useState<VariantData[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const { value: pendingPercentages, setValue: setPendingPercentages } = useField<Record<
    string,
    number
  > | null>({ path: AB_PENDING_PERCENTAGES_FIELD });

  const fetchVariants = useCallback(async () => {
    if (!id || !slug) return;
    setLoading(true);
    try {
      const query = `where[${AB_VARIANT_OF_FIELD}][equals]=${id}&limit=100&depth=0&draft=true`;
      const res = await fetch(`/api/${slug}?${query}`);
      if (!res.ok) throw new Error("Failed to fetch variants");
      const data: { docs?: Record<string, unknown>[] } = await res.json();
      setVariants(
        (data.docs ?? []).map((doc) => ({
          id: String(doc.id),
          title: String(doc[titleField] ?? doc[slugField] ?? doc.id),
          slug: doc[slugField] as string | undefined,
          passPercentage: (doc[AB_PASS_PERCENTAGE_FIELD] as number | null) ?? 1,
        }))
      );
    } catch {
      toast.error("Couldn't load variants");
    } finally {
      setLoading(false);
    }
  }, [id, slug, slugField, titleField]);

  useEffect(() => {
    fetchVariants();
  }, [fetchVariants]);

  const dropPending = (ids: string[]) => {
    if (!pendingPercentages) return;
    const next = { ...pendingPercentages };
    for (const variantId of ids) delete next[variantId];
    setPendingPercentages(Object.keys(next).length > 0 ? next : null);
  };

  const sharedBy = (excludeId: string) =>
    variants.filter((v) => v.id !== excludeId).reduce((sum, v) => sum + v.passPercentage, 0);

  const maxFor = (variantId: string) => Math.max(1, AB_MAX_VARIANT_TOTAL - sharedBy(variantId));

  const setPercentage = (variantId: string, value: number) => {
    const clamped = Math.max(1, Math.min(Math.round(value), maxFor(variantId)));
    setVariants((prev) =>
      prev.map((v) => (v.id === variantId ? { ...v, passPercentage: clamped } : v))
    );
    setPendingPercentages({ ...(pendingPercentages ?? {}), [variantId]: clamped });
  };

  const createVariant = async () => {
    if (!id || !slug) return;
    setBusy(true);
    try {
      const res = await fetch("/api/_ab/duplicate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ collectionSlug: slug, docId: id, slugField }),
      });
      const body = await res.json();
      if (!res.ok) {
        toast.error(body.error ?? "Couldn't create a variant");
        return;
      }
      dropPending(variants.map((v) => v.id));
      await fetchVariants();
      toast.success("Variant created. Edit it to change what visitors see.");
    } catch {
      toast.error("Couldn't create a variant");
    } finally {
      setBusy(false);
    }
  };

  const deleteVariants = async (ids: string[]) => {
    if (!slug || ids.length === 0) return;
    setBusy(true);
    try {
      const results = await Promise.all(
        ids.map(async (variantId) => {
          const res = await fetch(`/api/${slug}/${variantId}`, { method: "DELETE" });
          return res.ok ? variantId : null;
        })
      );
      const deleted = new Set(results.filter((r): r is string => r !== null));
      setVariants((prev) => prev.filter((v) => !deleted.has(v.id)));
      dropPending([...deleted]);
      const failed = ids.length - deleted.size;
      if (failed > 0) toast.error(`${failed} of ${ids.length} couldn't be deleted`);
      else toast.success(ids.length === 1 ? "Variant deleted" : "A/B test stopped");
    } finally {
      setBusy(false);
    }
  };

  if (!id) {
    return (
      <section className="ab-test">
        <div className="field-label ab-test__title">A/B test</div>
        <p className="field-description ab-test__description">
          Save the page first, then create variants to test.
        </p>
      </section>
    );
  }

  const variantTotal = variants.reduce((sum, v) => sum + v.passPercentage, 0);
  const originalPercentage = Math.max(0, 100 - variantTotal);
  const running = variants.length > 0;
  const hasUnsavedSplit = Boolean(pendingPercentages && Object.keys(pendingPercentages).length);

  return (
    <section className="ab-test" aria-busy={busy || loading} data-busy={busy || undefined}>
      <header className="ab-test__header">
        <div className="field-label ab-test__title">A/B test</div>
        {running && (
          <Pill pillStyle="success" size="small">
            Running
          </Pill>
        )}
      </header>

      {loading ? (
        <div className="ab-test__skeleton" aria-label="Loading variants" />
      ) : running ? (
        <>
          <p className="field-description ab-test__description">
            Visitors are split at random and keep their version on return visits.
          </p>
          <SplitBar
            segments={[
              { id: "original", label: "Original", value: originalPercentage },
              ...variants.map((v) => ({
                id: v.id,
                label: v.title ?? v.id,
                value: v.passPercentage,
              })),
            ]}
          />
          <ul className="ab-test__rows">
            <li className="ab-row ab-row--original">
              <span className="ab-row__swatch" data-series="0" aria-hidden="true" />
              <span className="ab-row__name">
                Original
                <span className="ab-row__hint">This page</span>
              </span>
              <span className="ab-row__value">{originalPercentage}%</span>
            </li>
            {variants.map((variant, index) => (
              <VariantRow
                key={variant.id}
                variant={variant}
                series={index + 1}
                collectionSlug={slug!}
                max={maxFor(variant.id)}
                onPercentageChange={(value) => setPercentage(variant.id, value)}
                onDelete={() => deleteVariants([variant.id])}
                onSaved={fetchVariants}
              />
            ))}
          </ul>
          {hasUnsavedSplit && (
            <p className="ab-test__notice" role="status">
              New split applies to visitors after you save the page.
            </p>
          )}
          <div className="ab-test__actions">
            <Button
              buttonStyle="secondary"
              size="small"
              icon="plus"
              iconPosition="left"
              onClick={createVariant}
              disabled={busy || variantTotal >= AB_MAX_VARIANT_TOTAL}
              margin={false}
            >
              Add variant
            </Button>
            <button
              type="button"
              className="ab-test__stop"
              onClick={() => openModal(STOP_TEST_MODAL)}
              disabled={busy}
            >
              Stop test
            </button>
          </div>
          <ConfirmationModal
            modalSlug={STOP_TEST_MODAL}
            heading="Stop this A/B test?"
            body={`This deletes ${variants.length} ${variants.length === 1 ? "variant" : "variants"}. Every visitor will see the original page.`}
            confirmLabel="Stop test"
            onConfirm={() => deleteVariants(variants.map((v) => v.id))}
          />
        </>
      ) : (
        <div className="ab-test__empty">
          <p className="field-description ab-test__description">
            Show a changed copy of this page to part of your visitors and compare which one performs
            better.
          </p>
          <Button
            buttonStyle="secondary"
            size="small"
            icon="plus"
            iconPosition="left"
            onClick={createVariant}
            disabled={busy}
            margin={false}
          >
            Create variant
          </Button>
        </div>
      )}
    </section>
  );
}

export default VariantsField;
