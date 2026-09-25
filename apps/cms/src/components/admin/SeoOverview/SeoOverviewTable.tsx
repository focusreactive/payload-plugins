"use client";

import { Button, Link, Pill, toast } from "@payloadcms/ui";
import { useMemo, useState } from "react";

import type { SeoOverviewRow, SeoOverviewType } from "./types";
import { SEO_DESCRIPTION_LIMIT, SEO_TITLE_LIMIT } from "./types";

const TYPES: SeoOverviewType[] = ["Page", "Service", "Insight", "Person"];

const isBlank = (value: string | null) => !value || value.trim() === "";

type Props = {
  adminRoute: string;
  apiRoute: string;
  locale: string;
  locales: { code: string; label: string }[];
  rows: SeoOverviewRow[];
};

type Draft = { seoDescription: string; seoTitle: string };

function rowKey(row: Pick<SeoOverviewRow, "collection" | "id">) {
  return `${row.collection}:${row.id}`;
}

function CharacterCount({ limit, value }: { limit: number; value: string | null }) {
  const length = value?.trim().length ?? 0;
  return (
    <span
      className={`seo-overview__count${length > limit ? " seo-overview__count--over" : ""}`}
      title={length > limit ? `Longer than the ${limit} characters search results show` : undefined}
    >
      {length}/{limit}
    </span>
  );
}

function SeoValue({ limit, value }: { limit: number; value: string | null }) {
  if (isBlank(value)) {
    return (
      <Pill pillStyle="error" size="small">
        Missing
      </Pill>
    );
  }
  return (
    <div className="seo-overview__value">
      <span>{value}</span>
      <CharacterCount limit={limit} value={value} />
    </div>
  );
}

/**
 * A page whose newest version is already published gets its SEO change published straight away,
 * because nothing else is waiting in it. A page with a draft on top keeps the change in that
 * draft, so saving an SEO title never publishes someone else's unreviewed edits along with it.
 */
function saveAsDraft(row: SeoOverviewRow) {
  return row.hasDrafts && row.latestIsDraft;
}

async function readErrorMessage(response: Response) {
  try {
    const body = (await response.json()) as { errors?: { message?: string }[] };
    const message = body.errors?.[0]?.message;
    if (
      response.status === 403 &&
      (!message || message === "You are not allowed to perform this action.")
    ) {
      return "You are not allowed to change this document.";
    }
    return message ?? `Saving failed (${response.status}).`;
  } catch {
    return `Saving failed (${response.status}).`;
  }
}

export function SeoOverviewTable({
  adminRoute,
  apiRoute,
  locale,
  locales,
  rows: initialRows,
}: Props) {
  const [rows, setRows] = useState(initialRows);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<SeoOverviewType | "all">("all");
  const [missingTitleOnly, setMissingTitleOnly] = useState(false);
  const [missingDescriptionOnly, setMissingDescriptionOnly] = useState(false);
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft>({ seoDescription: "", seoTitle: "" });
  const [savingKey, setSavingKey] = useState<string | null>(null);

  const visibleRows = useMemo(() => {
    const query = search.trim().toLowerCase();
    return rows.filter((row) => {
      if (typeFilter !== "all" && row.type !== typeFilter) return false;
      if (missingTitleOnly && !isBlank(row.seoTitle)) return false;
      if (missingDescriptionOnly && !isBlank(row.seoDescription)) return false;
      if (!query) return true;
      return [row.title, row.path, row.seoTitle, row.seoDescription].some((text) =>
        text?.toLowerCase().includes(query)
      );
    });
  }, [rows, search, typeFilter, missingTitleOnly, missingDescriptionOnly]);

  const missingTitleCount = rows.filter((row) => isBlank(row.seoTitle)).length;
  const missingDescriptionCount = rows.filter((row) => isBlank(row.seoDescription)).length;
  const blockedReasons = [
    ...new Set(rows.map((row) => row.editBlockedReason).filter((reason) => reason !== null)),
  ];

  const startEditing = (row: SeoOverviewRow) => {
    setEditingKey(rowKey(row));
    setDraft({ seoDescription: row.seoDescription ?? "", seoTitle: row.seoTitle ?? "" });
  };

  const save = async (row: SeoOverviewRow) => {
    const key = rowKey(row);
    setSavingKey(key);
    try {
      const query = new URLSearchParams({
        depth: "0",
        draft: String(saveAsDraft(row)),
        fallbackLocale: "none",
        locale,
      });
      const response = await fetch(`${apiRoute}/${row.collection}/${row.id}?${query}`, {
        body: JSON.stringify({
          meta: { description: draft.seoDescription, title: draft.seoTitle },
        }),
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        method: "PATCH",
      });
      if (!response.ok) {
        toast.error(await readErrorMessage(response));
        return;
      }
      const { doc } = (await response.json()) as {
        doc: { meta?: { description?: string | null; title?: string | null } };
      };
      setRows((current) =>
        current.map((candidate) =>
          rowKey(candidate) === key
            ? {
                ...candidate,
                seoDescription: doc.meta?.description ?? null,
                seoTitle: doc.meta?.title ?? null,
              }
            : candidate
        )
      );
      setEditingKey(null);
      toast.success(
        saveAsDraft(row)
          ? `Saved to the draft of "${row.title}". Publish it from the page when its other changes are reviewed.`
          : `Saved and published "${row.title}".`
      );
    } catch {
      toast.error("Saving failed: the server could not be reached.");
    } finally {
      setSavingKey(null);
    }
  };

  return (
    <div className="seo-overview__body">
      <div className="seo-overview__controls">
        <div className="seo-overview__locales" role="group" aria-label="Language">
          {locales.map((option) => (
            <Link
              aria-current={option.code === locale ? "true" : undefined}
              className={`seo-overview__locale${option.code === locale ? " seo-overview__locale--active" : ""}`}
              href={`${adminRoute}/seo-overview?locale=${option.code}`}
              key={option.code}
              prefetch={false}
            >
              {option.code.toUpperCase()}
            </Link>
          ))}
        </div>
        <input
          aria-label="Search"
          className="seo-overview__search"
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search name, path or SEO text"
          type="search"
          value={search}
        />
        <select
          aria-label="Type"
          className="seo-overview__select"
          onChange={(event) => setTypeFilter(event.target.value as SeoOverviewType | "all")}
          value={typeFilter}
        >
          <option value="all">All types</option>
          {TYPES.map((type) => (
            <option key={type} value={type}>
              {type}
            </option>
          ))}
        </select>
        <label className="seo-overview__toggle">
          <input
            checked={missingTitleOnly}
            onChange={(event) => setMissingTitleOnly(event.target.checked)}
            type="checkbox"
          />
          Missing SEO title ({missingTitleCount})
        </label>
        <label className="seo-overview__toggle">
          <input
            checked={missingDescriptionOnly}
            onChange={(event) => setMissingDescriptionOnly(event.target.checked)}
            type="checkbox"
          />
          Missing SEO description ({missingDescriptionCount})
        </label>
      </div>

      <p className="seo-overview__summary">
        Showing {visibleRows.length} of {rows.length} in {locale.toUpperCase()}. Search results show
        about {SEO_TITLE_LIMIT} characters of a title and {SEO_DESCRIPTION_LIMIT} of a description.
      </p>

      {blockedReasons.length > 0 ? (
        <p className="seo-overview__summary">Rows marked read only: {blockedReasons.join(" ")}</p>
      ) : null}

      <div className="table seo-overview__table-wrap">
        <table cellPadding="0" cellSpacing="0">
          <thead>
            <tr>
              <th>Type</th>
              <th>Name</th>
              <th>Path</th>
              <th>SEO title</th>
              <th>SEO description</th>
              <th aria-label="Actions" />
            </tr>
          </thead>
          <tbody>
            {visibleRows.map((row) => {
              const key = rowKey(row);
              const isEditing = editingKey === key;
              const isSaving = savingKey === key;
              return (
                <tr className={isEditing ? "seo-overview__row--editing" : undefined} key={key}>
                  <td>{row.type}</td>
                  <td>
                    <Link
                      href={`${adminRoute}/collections/${row.collection}/${row.id}?locale=${locale}`}
                      prefetch={false}
                    >
                      {row.title}
                    </Link>
                    {row.latestIsDraft ? (
                      <div className="seo-overview__note">Has unpublished changes</div>
                    ) : null}
                  </td>
                  <td className="seo-overview__path">{row.path ?? "No public address"}</td>
                  <td>
                    {isEditing ? (
                      <div className="seo-overview__editor">
                        <input
                          aria-label={`SEO title for ${row.title}`}
                          onChange={(event) =>
                            setDraft((current) => ({ ...current, seoTitle: event.target.value }))
                          }
                          type="text"
                          value={draft.seoTitle}
                        />
                        <CharacterCount limit={SEO_TITLE_LIMIT} value={draft.seoTitle} />
                      </div>
                    ) : (
                      <SeoValue limit={SEO_TITLE_LIMIT} value={row.seoTitle} />
                    )}
                  </td>
                  <td>
                    {isEditing ? (
                      <div className="seo-overview__editor">
                        <textarea
                          aria-label={`SEO description for ${row.title}`}
                          onChange={(event) =>
                            setDraft((current) => ({
                              ...current,
                              seoDescription: event.target.value,
                            }))
                          }
                          rows={3}
                          value={draft.seoDescription}
                        />
                        <CharacterCount
                          limit={SEO_DESCRIPTION_LIMIT}
                          value={draft.seoDescription}
                        />
                      </div>
                    ) : (
                      <SeoValue limit={SEO_DESCRIPTION_LIMIT} value={row.seoDescription} />
                    )}
                  </td>
                  <td className="seo-overview__actions">
                    {row.editBlockedReason ? (
                      <span className="seo-overview__note" title={row.editBlockedReason}>
                        Read only
                      </span>
                    ) : isEditing ? (
                      <>
                        <Button
                          buttonStyle="primary"
                          disabled={isSaving}
                          margin={false}
                          onClick={() => save(row)}
                          size="small"
                        >
                          {isSaving
                            ? "Saving"
                            : saveAsDraft(row)
                              ? "Save draft"
                              : "Save and publish"}
                        </Button>
                        <Button
                          buttonStyle="secondary"
                          disabled={isSaving}
                          margin={false}
                          onClick={() => setEditingKey(null)}
                          size="small"
                        >
                          Cancel
                        </Button>
                      </>
                    ) : (
                      <Button
                        buttonStyle="secondary"
                        disabled={editingKey !== null}
                        margin={false}
                        onClick={() => startEditing(row)}
                        size="small"
                      >
                        Edit
                      </Button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {visibleRows.length === 0 ? (
          <p className="seo-overview__empty">Nothing matches these filters.</p>
        ) : null}
      </div>
    </div>
  );
}
