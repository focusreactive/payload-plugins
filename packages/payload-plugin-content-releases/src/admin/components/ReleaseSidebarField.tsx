"use client";

import React, { useCallback, useEffect, useState } from "react";
import { Button, useDocumentInfo, useForm } from "@payloadcms/ui";
import { ReleaseDrawer } from "./ReleaseDrawer";
import { VersionPickerDrawer } from "./VersionPickerDrawer";

interface ReleaseInfo {
  id: string;
  releaseId: string;
  releaseName: string;
  releaseStatus: string;
}

export function ReleaseSidebarField() {
  const { id, collectionSlug } = useDocumentInfo();
  const { getData } = useForm();
  const [releases, setReleases] = useState<ReleaseInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [showReleaseDrawer, setShowReleaseDrawer] = useState(false);
  const [showVersionDrawer, setShowVersionDrawer] = useState(false);
  const [currentSnapshot, setCurrentSnapshot] = useState<Record<string, any> | null>(null);

  const fetchReleases = useCallback(async () => {
    if (!id || !collectionSlug) return;
    setLoading(true);
    try {
      const res = await fetch(
        `/api/release-items?where[targetDoc][equals]=${id}&where[targetCollection][equals]=${collectionSlug}&depth=1&limit=100`
      );
      if (!res.ok) return;
      const data = await res.json();
      setReleases(
        (data.docs ?? []).map((item: any) => ({
          id: item.id,
          releaseId: typeof item.release === "object" ? item.release.id : item.release,
          releaseName: typeof item.release === "object" ? item.release.name : `Release ${item.release}`,
          releaseStatus: typeof item.release === "object" ? item.release.status : "unknown",
        }))
      );
    } catch {
      // non-fatal
    } finally {
      setLoading(false);
    }
  }, [id, collectionSlug]);

  useEffect(() => {
    fetchReleases();
  }, [fetchReleases]);

  if (!id) return null;

  const statusBadgeColor = (status: string) => {
    switch (status) {
      case "published": return "#22c55e";
      case "scheduled": return "#3b82f6";
      case "failed": return "#ef4444";
      default: return "#94a3b8";
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
      <div style={{ fontWeight: 600, fontSize: "13px", textTransform: "uppercase", color: "#888" }}>
        Releases
      </div>

      {loading ? (
        <div style={{ fontSize: "13px", color: "#888" }}>Loading...</div>
      ) : releases.length === 0 ? (
        <div style={{ fontSize: "13px", color: "#888" }}>Not in any release</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
          {releases.map((r) => (
            <div
              key={r.id}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "6px 8px",
                borderRadius: "4px",
                border: "1px solid var(--theme-elevation-200)",
                fontSize: "13px",
              }}
            >
              <span>{r.releaseName}</span>
              <span
                style={{
                  fontSize: "11px",
                  padding: "2px 6px",
                  borderRadius: "10px",
                  backgroundColor: statusBadgeColor(r.releaseStatus),
                  color: "#fff",
                }}
              >
                {r.releaseStatus}
              </span>
            </div>
          ))}
        </div>
      )}

      <Button
        size="small"
        buttonStyle="pill"
        onClick={() => {
          const formData = getData();
          setCurrentSnapshot(formData);
          setShowReleaseDrawer(true);
        }}
      >
        Add Current State to Release
      </Button>

      <Button
        size="small"
        buttonStyle="pill"
        onClick={() => setShowVersionDrawer(true)}
      >
        Add Version to Release
      </Button>

      {showReleaseDrawer && currentSnapshot && (
        <ReleaseDrawer
          snapshot={currentSnapshot}
          collectionSlug={collectionSlug!}
          docId={String(id)}
          onClose={() => {
            setShowReleaseDrawer(false);
            setCurrentSnapshot(null);
            fetchReleases();
          }}
        />
      )}

      {showVersionDrawer && (
        <VersionPickerDrawer
          collectionSlug={collectionSlug!}
          docId={String(id)}
          onClose={() => {
            setShowVersionDrawer(false);
            fetchReleases();
          }}
        />
      )}
    </div>
  );
}
