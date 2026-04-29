"use client";

import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Button, Drawer, Pill, toast, useModal, DatePicker } from "@payloadcms/ui";

interface Release {
  id: string;
  name: string;
  status: string;
  createdAt: string;
  scheduledAt?: string;
}

interface ReleaseDrawerProps {
  slug: string;
  snapshot: Record<string, any> | null;
  collectionSlug: string;
  docId: string;
  baseVersion?: string;
  onSuccess: () => void;
  onBack?: () => void;
}

export function ReleaseDrawer({
  slug,
  snapshot,
  collectionSlug,
  docId,
  baseVersion,
  onSuccess,
  onBack,
}: ReleaseDrawerProps) {
  const { closeModal, modalState, containerRef } = useModal();
  const isOpen = !!modalState[slug]?.isOpen;
  const [releases, setReleases] = useState<Release[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newScheduledAt, setNewScheduledAt] = useState("");

  const fetchDraftReleases = useCallback(async () => {
    if (!isOpen) return;
    setLoading(true);
    try {
      const res = await fetch(
        "/api/releases?where[status][in]=draft,scheduled&sort=-createdAt&limit=100"
      );
      if (!res.ok) return;
      const data = await res.json();
      setReleases(data.docs ?? []);
    } catch {
      // non-fatal
    } finally {
      setLoading(false);
    }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      fetchDraftReleases();
      setShowCreateForm(false);
      setNewName("");
      setNewDescription("");
      setNewScheduledAt("");
    }
  }, [isOpen, fetchDraftReleases]);

  const addToRelease = useCallback(
    async (releaseId: string, releaseName: string) => {
      if (!snapshot) return;
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
                closeModal(slug);
                onSuccess();
                return;
              }
            }
            return;
          }
          toast.error(errMsg);
          return;
        }

        toast.success(`Added to "${releaseName}"`);
        closeModal(slug);
        onSuccess();
      } catch {
        toast.error("Failed to add to release");
      }
    },
    [collectionSlug, docId, snapshot, baseVersion, slug, closeModal, onSuccess]
  );

  const createAndAdd = useCallback(async () => {
    if (!newName.trim()) return;
    setCreating(true);
    try {
      const releaseData: Record<string, any> = {
        name: newName.trim(),
        description: newDescription.trim() || undefined,
      };
      if (newScheduledAt) {
        releaseData.scheduledAt = new Date(newScheduledAt).toISOString();
      }

      const res = await fetch("/api/releases", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(releaseData),
      });
      if (!res.ok) {
        toast.error("Failed to create release");
        return;
      }
      const data = await res.json();
      await addToRelease(data.doc.id, data.doc.name);

      if (newScheduledAt) {
        await fetch(`/api/releases/${data.doc.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: "scheduled" }),
        });
      }
    } catch {
      toast.error("Failed to create release");
    } finally {
      setCreating(false);
    }
  }, [newName, newDescription, newScheduledAt, addToRelease]);

  const header = (
    <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "16px 24px" }}>
      {onBack && (
        <button
          onClick={onBack}
          style={{ background: "none", border: "none", cursor: "pointer", fontSize: 18, color: "var(--theme-text)", padding: 0 }}
        >
          ←
        </button>
      )}
      <h2 style={{ margin: 0, fontSize: 18, fontWeight: 600 }}>Add to Release</h2>
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
        <div style={{ padding: "0 24px 24px", display: "flex", flexDirection: "column", gap: 16 }}>
          {/* Create New Release */}
          {!showCreateForm ? (
            <div>
              <Button buttonStyle="primary" size="medium" onClick={() => setShowCreateForm(true)}>
                Create New Release
              </Button>
            </div>
          ) : (
            <div style={{
              border: "1px solid var(--theme-elevation-150)",
              borderRadius: "var(--style-radius-s)",
              padding: 16,
              display: "flex",
              flexDirection: "column",
              gap: 12,
            }}>
              <div className="field-type text">
                <label className="field-label">Name <span className="required">*</span></label>
                <input
                  className="field-type__input"
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Release name"
                  autoFocus
                />
              </div>
              <div className="field-type textarea">
                <label className="field-label">Description</label>
                <textarea
                  className="field-type__textarea"
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  placeholder="Optional description"
                  rows={2}
                />
              </div>
              <div className="field-type date-time-picker">
                <label className="field-label">Schedule publish</label>
                <DatePicker
                  pickerAppearance="dayAndTime"
                  value={newScheduledAt ? new Date(newScheduledAt) : undefined}
                  onChange={(val: Date) => setNewScheduledAt(val ? val.toISOString() : "")}
                  placeholder="Select date and time"
                />
              </div>
              <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
                <Button buttonStyle="primary" size="medium" onClick={createAndAdd} disabled={!newName.trim() || creating}>
                  {creating ? "Creating..." : "Create & Add"}
                </Button>
                <Button buttonStyle="secondary" size="medium" onClick={() => setShowCreateForm(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          )}

          {/* Release List */}
          <label className="field-label" style={{ marginBottom: -8 }}>Available Releases</label>

          {loading ? (
            <div style={{ padding: "8px 0" }}>Loading...</div>
          ) : releases.length === 0 ? (
            <p style={{ fontSize: 13, color: "var(--theme-elevation-500)", margin: 0 }}>
              No available releases. Create one above.
            </p>
          ) : (
            <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 4 }}>
              {releases.map((r) => (
                <li key={r.id}>
                  <button
                    onClick={() => addToRelease(r.id, r.name)}
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
                      <span style={{ fontWeight: 500 }}>{r.name}</span>
                      {r.scheduledAt && (
                        <span style={{ fontSize: 11, color: "var(--theme-elevation-500)" }}>
                          Scheduled: {new Date(r.scheduledAt).toLocaleString()}
                        </span>
                      )}
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 2 }}>
                      <Pill pillStyle={r.status === "scheduled" ? "dark" : "light-gray" as any} size="small">
                        {r.status}
                      </Pill>
                      <span style={{ fontSize: 11, color: "var(--theme-elevation-500)" }}>
                        {new Date(r.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </Drawer>
    </>
  );
}
