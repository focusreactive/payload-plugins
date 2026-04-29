"use client";

import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Drawer, Pill, useModal } from "@payloadcms/ui";
import { ReleaseDrawer } from "./ReleaseDrawer";

const RELEASE_FROM_VERSION_SLUG = "content-releases-from-version";

interface VersionEntry {
  id: string;
  updatedAt: string;
  status?: string;
  autosave?: boolean;
  version: Record<string, any>;
}

interface VersionPickerDrawerProps {
  slug: string;
  collectionSlug: string;
  docId: string;
  onSuccess: () => void;
}

export function VersionPickerDrawer({
  slug,
  collectionSlug,
  docId,
  onSuccess,
}: VersionPickerDrawerProps) {
  const { closeModal, openModal, modalState, containerRef } = useModal();
  const isOpen = !!modalState[slug]?.isOpen;
  const [versions, setVersions] = useState<VersionEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedVersion, setSelectedVersion] = useState<VersionEntry | null>(null);

  const fetchVersions = useCallback(async () => {
    if (!isOpen) return;
    setLoading(true);
    try {
      const res = await fetch(
        `/api/${collectionSlug}/versions?where[parent][equals]=${docId}&sort=-updatedAt&limit=20`
      );
      if (!res.ok) return;
      const data = await res.json();
      setVersions(
        (data.docs ?? []).map((v: any) => ({
          id: v.id,
          updatedAt: v.updatedAt,
          status: v.version?._status,
          autosave: v.autosave,
          version: v.version,
        }))
      );
    } catch {
      // non-fatal
    } finally {
      setLoading(false);
    }
  }, [collectionSlug, docId, isOpen]);

  useEffect(() => {
    if (isOpen) {
      fetchVersions();
      setSelectedVersion(null);
    }
  }, [isOpen, fetchVersions]);

  const handleVersionSelect = useCallback((v: VersionEntry) => {
    setSelectedVersion(v);
    closeModal(slug);
    openModal(RELEASE_FROM_VERSION_SLUG);
  }, [slug, closeModal, openModal]);

  const handleBack = useCallback(() => {
    closeModal(RELEASE_FROM_VERSION_SLUG);
    openModal(slug);
  }, [slug, closeModal, openModal]);

  const handleReleaseSuccess = useCallback(() => {
    closeModal(RELEASE_FROM_VERSION_SLUG);
    onSuccess();
  }, [closeModal, onSuccess]);

  const header = (
    <div style={{ padding: "16px 24px" }}>
      <h2 style={{ margin: 0, fontSize: 18, fontWeight: 600 }}>Select Version</h2>
    </div>
  );

  return (
    <>
      {isOpen && containerRef.current && createPortal(
        <div
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 29, cursor: "pointer" }}
          onClick={() => closeModal(slug)}
        />,
        containerRef.current,
      )}
      <Drawer slug={slug} Header={header} className="max-w-[420px] w-full m-0 ml-auto">
        <div style={{ padding: "0 24px 24px", display: "flex", flexDirection: "column", gap: 8 }}>
          {loading ? (
            <div style={{ padding: "8px 0", color: "var(--theme-elevation-500)" }}>Loading versions...</div>
          ) : versions.length === 0 ? (
            <p style={{ fontSize: 13, color: "var(--theme-elevation-500)", margin: 0 }}>
              No versions found for this document.
            </p>
          ) : (
            <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 4 }}>
              {versions.map((v) => (
                <li key={v.id}>
                  <button
                    onClick={() => handleVersionSelect(v)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      width: "100%",
                      padding: "10px 12px",
                      borderRadius: "var(--style-radius-s)",
                      border: "1px solid var(--theme-elevation-150)",
                      background: "var(--theme-elevation-50)",
                      cursor: "pointer",
                      textAlign: "left",
                      fontSize: 14,
                      color: "var(--theme-text)",
                    }}
                  >
                    <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                      <span style={{ fontWeight: 500 }}>
                        {new Date(v.updatedAt).toLocaleString()}
                      </span>
                      {v.autosave && (
                        <span style={{ fontSize: 11, color: "var(--theme-elevation-500)" }}>(autosave)</span>
                      )}
                    </div>
                    {v.status && (
                      <Pill pillStyle={v.status === "published" ? "success" : "light-gray" as any} size="small">
                        {v.status}
                      </Pill>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          )}

          <a
            href={`/admin/collections/${collectionSlug}/${docId}/versions`}
            style={{ fontSize: 13, color: "var(--theme-elevation-500)", textDecoration: "underline", marginTop: 8 }}
          >
            View all versions →
          </a>
        </div>
      </Drawer>

      {/* Release drawer opened from version selection */}
      <ReleaseDrawer
        slug={RELEASE_FROM_VERSION_SLUG}
        snapshot={selectedVersion?.version ?? null}
        collectionSlug={collectionSlug}
        docId={docId}
        baseVersion={selectedVersion?.updatedAt}
        onSuccess={handleReleaseSuccess}
        onBack={handleBack}
      />
    </>
  );
}
