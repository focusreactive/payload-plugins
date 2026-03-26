"use client";

import React, { useCallback, useEffect, useState } from "react";
import { ReleaseDrawer } from "./ReleaseDrawer";

interface VersionEntry {
  id: string;
  updatedAt: string;
  status?: string;
  autosave?: boolean;
  version: Record<string, any>;
}

interface VersionPickerDrawerProps {
  collectionSlug: string;
  docId: string;
  onClose: () => void;
}

export function VersionPickerDrawer({
  collectionSlug,
  docId,
  onClose,
}: VersionPickerDrawerProps) {
  const [versions, setVersions] = useState<VersionEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedVersion, setSelectedVersion] = useState<VersionEntry | null>(null);

  const fetchVersions = useCallback(async () => {
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
  }, [collectionSlug, docId]);

  useEffect(() => {
    fetchVersions();
  }, [fetchVersions]);

  // Step 2: Show ReleaseDrawer with version snapshot
  if (selectedVersion) {
    return (
      <ReleaseDrawer
        snapshot={selectedVersion.version}
        collectionSlug={collectionSlug}
        docId={docId}
        baseVersion={selectedVersion.updatedAt}
        onClose={onClose}
        onBack={() => setSelectedVersion(null)}
      />
    );
  }

  // Step 1: Show version list
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.5)",
        zIndex: 1000,
        display: "flex",
        justifyContent: "flex-end",
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        style={{
          width: 420,
          background: "var(--theme-elevation-0)",
          padding: 24,
          overflowY: "auto",
          display: "flex",
          flexDirection: "column",
          gap: 16,
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h3 style={{ margin: 0 }}>Select Version</h3>
          <button
            onClick={onClose}
            style={{ background: "none", border: "none", fontSize: 18, cursor: "pointer", color: "var(--theme-text)", padding: 0 }}
          >
            ✕
          </button>
        </div>

        {loading ? (
          <div style={{ fontSize: 13, color: "#888" }}>Loading versions...</div>
        ) : versions.length === 0 ? (
          <div style={{ fontSize: 13, color: "#888" }}>No versions found for this document.</div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {versions.map((v) => (
              <button
                key={v.id}
                onClick={() => setSelectedVersion(v)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "10px 12px",
                  borderRadius: 4,
                  border: "1px solid var(--theme-elevation-200)",
                  background: "var(--theme-elevation-50)",
                  cursor: "pointer",
                  textAlign: "left",
                  fontSize: 14,
                  color: "var(--theme-text)",
                  width: "100%",
                }}
              >
                <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                  <span style={{ fontWeight: 500 }}>
                    {new Date(v.updatedAt).toLocaleString()}
                  </span>
                  {v.autosave && (
                    <span style={{ fontSize: 11, color: "#888" }}>(autosave)</span>
                  )}
                </div>
                {v.status && (
                  <span
                    style={{
                      fontSize: 11,
                      padding: "2px 6px",
                      borderRadius: 10,
                      backgroundColor: v.status === "published" ? "#22c55e" : "#94a3b8",
                      color: "#fff",
                    }}
                  >
                    {v.status}
                  </span>
                )}
              </button>
            ))}
          </div>
        )}

        <a
          href={`/admin/collections/${collectionSlug}/${docId}/versions`}
          style={{ fontSize: 13, color: "var(--theme-text)", textDecoration: "underline" }}
        >
          View all versions →
        </a>
      </div>
    </div>
  );
}
