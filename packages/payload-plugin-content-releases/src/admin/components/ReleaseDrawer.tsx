"use client";

import React, { useCallback, useEffect, useState } from "react";
import { Button, toast } from "@payloadcms/ui";

interface Release {
  id: string;
  name: string;
  status: string;
  createdAt: string;
}

interface ReleaseDrawerProps {
  snapshot: Record<string, any>;
  collectionSlug: string;
  docId: string;
  baseVersion?: string;
  onClose: () => void;
  onBack?: () => void;
}

export function ReleaseDrawer({
  snapshot,
  collectionSlug,
  docId,
  baseVersion,
  onClose,
  onBack,
}: ReleaseDrawerProps) {
  const [releases, setReleases] = useState<Release[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDescription, setNewDescription] = useState("");

  const fetchDraftReleases = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(
        "/api/releases?where[status][equals]=draft&sort=-createdAt&limit=100"
      );
      if (!res.ok) return;
      const data = await res.json();
      setReleases(data.docs ?? []);
    } catch {
      // non-fatal
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDraftReleases();
  }, [fetchDraftReleases]);

  const addToRelease = useCallback(
    async (releaseId: string, releaseName: string) => {
      try {
        const res = await fetch("/api/release-items", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            release: releaseId,
            targetCollection: collectionSlug,
            targetDoc: docId,
            action: "publish",
            snapshot,
            baseVersion: baseVersion ?? null,
          }),
        });

        if (!res.ok) {
          const err = await res.json();
          const errMsg = err.errors?.[0]?.message ?? err.message ?? "Failed";

          if (errMsg.toLowerCase().includes("already exists")) {
            const confirmed = window.confirm(
              "This document is already in this release. Replace snapshot?"
            );
            if (confirmed) {
              const existing = await fetch(
                `/api/release-items?where[release][equals]=${releaseId}&where[targetDoc][equals]=${docId}&where[targetCollection][equals]=${collectionSlug}&limit=1`
              );
              const existingData = await existing.json();
              const existingItem = existingData.docs?.[0];
              if (existingItem) {
                await fetch(`/api/release-items/${existingItem.id}`, {
                  method: "PATCH",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ snapshot, baseVersion: baseVersion ?? null }),
                });
                toast.success(`Updated snapshot in "${releaseName}"`);
                onClose();
                return;
              }
            }
            return;
          }

          toast.error(errMsg);
          return;
        }

        toast.success(`Added to "${releaseName}"`);
        onClose();
      } catch {
        toast.error("Failed to add to release");
      }
    },
    [collectionSlug, docId, snapshot, baseVersion, onClose]
  );

  const createAndAdd = useCallback(async () => {
    if (!newName.trim()) return;
    setCreating(true);
    try {
      const res = await fetch("/api/releases", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newName.trim(),
          description: newDescription.trim() || undefined,
        }),
      });
      if (!res.ok) {
        toast.error("Failed to create release");
        return;
      }
      const data = await res.json();
      await addToRelease(data.doc.id, data.doc.name);
    } catch {
      toast.error("Failed to create release");
    } finally {
      setCreating(false);
    }
  }, [newName, newDescription, addToRelease]);

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
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {onBack && (
              <button
                onClick={onBack}
                style={{ background: "none", border: "none", cursor: "pointer", fontSize: 16, color: "var(--theme-text)", padding: 0 }}
              >
                ←
              </button>
            )}
            <h3 style={{ margin: 0 }}>Add to Release</h3>
          </div>
          <button
            onClick={onClose}
            style={{ background: "none", border: "none", fontSize: 18, cursor: "pointer", color: "var(--theme-text)", padding: 0 }}
          >
            ✕
          </button>
        </div>

        {/* Create New Release */}
        {!showCreateForm ? (
          <Button size="small" onClick={() => setShowCreateForm(true)}>
            Create New Release
          </Button>
        ) : (
          <div
            style={{
              border: "1px solid var(--theme-elevation-200)",
              borderRadius: 4,
              padding: 12,
              display: "flex",
              flexDirection: "column",
              gap: 8,
            }}
          >
            <input
              type="text"
              placeholder="Release name *"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              style={{
                padding: "8px 10px",
                borderRadius: 4,
                border: "1px solid var(--theme-elevation-300)",
                background: "var(--theme-elevation-50)",
                color: "var(--theme-text)",
                fontSize: 14,
              }}
              autoFocus
            />
            <textarea
              placeholder="Description (optional)"
              value={newDescription}
              onChange={(e) => setNewDescription(e.target.value)}
              rows={2}
              style={{
                padding: "8px 10px",
                borderRadius: 4,
                border: "1px solid var(--theme-elevation-300)",
                background: "var(--theme-elevation-50)",
                color: "var(--theme-text)",
                fontSize: 14,
                resize: "vertical",
              }}
            />
            <div style={{ display: "flex", gap: 8 }}>
              <Button size="small" onClick={createAndAdd} disabled={!newName.trim() || creating}>
                {creating ? "Creating..." : "Create & Add"}
              </Button>
              <Button size="small" buttonStyle="secondary" onClick={() => setShowCreateForm(false)}>
                Cancel
              </Button>
            </div>
          </div>
        )}

        {/* Release List */}
        <div style={{ fontSize: 12, fontWeight: 600, textTransform: "uppercase", color: "#888" }}>
          Draft Releases
        </div>

        {loading ? (
          <div style={{ fontSize: 13, color: "#888" }}>Loading...</div>
        ) : releases.length === 0 ? (
          <div style={{ fontSize: 13, color: "#888" }}>No draft releases. Create one above.</div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {releases.map((r) => (
              <button
                key={r.id}
                onClick={() => addToRelease(r.id, r.name)}
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
                <span style={{ fontWeight: 500 }}>{r.name}</span>
                <span style={{ fontSize: 12, color: "#888" }}>
                  {new Date(r.createdAt).toLocaleDateString()}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
