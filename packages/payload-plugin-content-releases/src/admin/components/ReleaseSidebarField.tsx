"use client";

import React, { useCallback, useEffect, useState } from "react";
import { Button, Pill, ShimmerEffect, useDocumentInfo, useForm, useModal } from "@payloadcms/ui";
import { ReleaseDrawer } from "./ReleaseDrawer";
import { VersionPickerDrawer } from "./VersionPickerDrawer";

const RELEASE_DRAWER_SLUG = "content-releases-add";
const VERSION_DRAWER_SLUG = "content-releases-version";

interface ReleaseInfo {
  id: string;
  releaseId: string;
  releaseName: string;
  releaseStatus: string;
}

export function ReleaseSidebarField() {
  const { id, collectionSlug } = useDocumentInfo();
  const { getData } = useForm();
  const { openModal } = useModal();
  const [releases, setReleases] = useState<ReleaseInfo[]>([]);
  const [loading, setLoading] = useState(true);
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

  const getPillStyle = (status: string) => {
    switch (status) {
      case "published": return "success";
      case "scheduled": return "dark";
      case "failed": return "error";
      case "publishing": return "warning";
      default: return "light-gray";
    }
  };

  return (
    <div className="field-type" style={{ paddingTop: 0 }}>
      <label className="field-label">Releases</label>

      {loading ? (
        <ShimmerEffect />
      ) : releases.length === 0 ? (
        <p style={{ fontSize: 13, color: "var(--theme-elevation-500)", margin: "8px 0" }}>
          Not in any release
        </p>
      ) : (
        <ul className="list-style-none" style={{ padding: 0, margin: "8px 0", display: "flex", flexDirection: "column", gap: 4 }}>
          {releases.map((r) => (
            <li
              key={r.id}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "8px 12px",
                borderRadius: "var(--style-radius-s)",
                border: "1px solid var(--theme-elevation-150)",
                background: "var(--theme-elevation-50)",
              }}
            >
              <span style={{ fontSize: 13, fontWeight: 500 }}>{r.releaseName}</span>
              <Pill pillStyle={getPillStyle(r.releaseStatus) as any}>
                {r.releaseStatus}
              </Pill>
            </li>
          ))}
        </ul>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 8 }}>
        <Button
          size="small"
          buttonStyle="primary"
          onClick={() => {
            setCurrentSnapshot(getData());
            openModal(RELEASE_DRAWER_SLUG);
          }}
        >
          Add Current State to Release
        </Button>

        <Button
          size="small"
          buttonStyle="primary"
          onClick={() => openModal(VERSION_DRAWER_SLUG)}
        >
          Add Version to Release
        </Button>
      </div>

      <ReleaseDrawer
        slug={RELEASE_DRAWER_SLUG}
        snapshot={currentSnapshot}
        collectionSlug={collectionSlug!}
        docId={String(id)}
        onSuccess={fetchReleases}
      />

      <VersionPickerDrawer
        slug={VERSION_DRAWER_SLUG}
        collectionSlug={collectionSlug!}
        docId={String(id)}
        onSuccess={fetchReleases}
      />
    </div>
  );
}
