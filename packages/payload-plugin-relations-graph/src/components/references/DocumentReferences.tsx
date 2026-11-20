"use client";

import { Drawer, Link, useConfig, useDocumentInfo, useDrawerSlug, useModal } from "@payloadcms/ui";
import { formatAdminURL } from "payload/shared";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import type { ReferenceGroup, ReferencesResult } from "../../features/references/types.js";
import { ENDPOINT_BASE } from "../../lib/constants.js";
import { REFERENCES_CSS } from "./styles.js";

type State =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { result: ReferencesResult; status: "ready" };

interface SourceSection {
  key: string;
  groups: ReferenceGroup[];
}

const plural = (count: number, one: string, many: string): string =>
  `${count} ${count === 1 ? one : many}`;

const groupBySource = (groups: ReferenceGroup[]): SourceSection[] => {
  const sections = new Map<string, SourceSection>();
  for (const group of groups) {
    const key = `${group.source.kind}:${group.source.slug}`;
    const section = sections.get(key) ?? { groups: [], key };
    section.groups.push(group);
    sections.set(key, section);
  }
  return [...sections.values()];
};

const triggerLabel = (state: State): string => {
  if (state.status === "loading") {
    return "…";
  }
  if (state.status === "error") {
    return "?";
  }
  return String(state.result.total);
};

/**
 * "Used in N" control for the document edit view: lists the documents and globals that reference
 * this document, grouped by collection and field, in a drawer. Renders nothing before the
 * document has an id (create view).
 */
export const DocumentReferences = ({ limit = 10 }: { limit?: number }) => {
  const { collectionSlug, id } = useDocumentInfo();
  const { config } = useConfig();
  const { openModal } = useModal();
  const drawerSlug = useDrawerSlug("relations-graph-references");
  const [state, setState] = useState<State>({ status: "loading" });
  const request = useRef<AbortController | null>(null);

  const adminRoute = config.routes.admin;
  const url = useMemo(() => {
    if (!(collectionSlug && id !== undefined && id !== null)) {
      return null;
    }
    const params = new URLSearchParams({
      collection: collectionSlug,
      id: String(id),
      limit: String(limit),
    });
    return `${config.serverURL ?? ""}${config.routes.api}${ENDPOINT_BASE}/references?${params}`;
  }, [collectionSlug, config.routes.api, config.serverURL, id, limit]);

  const load = useCallback(async () => {
    if (!url) {
      return;
    }
    request.current?.abort();
    const controller = new AbortController();
    request.current = controller;
    setState({ status: "loading" });
    try {
      const response = await fetch(url, { credentials: "include", signal: controller.signal });
      const body = (await response.json()) as ReferencesResult | { error?: string };
      if (!response.ok || !("groups" in body)) {
        const message = "error" in body && body.error ? body.error : `HTTP ${response.status}`;
        setState({ message, status: "error" });
        return;
      }
      setState({ result: body, status: "ready" });
    } catch (error) {
      if (!controller.signal.aborted) {
        setState({
          message: error instanceof Error ? error.message : String(error),
          status: "error",
        });
      }
    }
  }, [url]);

  useEffect(() => {
    void load();
    return () => request.current?.abort();
  }, [load]);

  if (!url) {
    return null;
  }

  const total = state.status === "ready" ? state.result.total : 0;
  const triggerClass = [
    "rg-refs__trigger",
    total > 0 ? "rg-refs__trigger--used" : "",
    state.status === "error" ? "rg-refs__trigger--error" : "",
  ]
    .filter(Boolean)
    .join(" ");

  const docHref = (group: ReferenceGroup, docId: number | string): string =>
    formatAdminURL({
      adminRoute,
      path:
        group.source.kind === "global"
          ? `/globals/${group.source.slug}`
          : `/collections/${group.source.slug}/${encodeURIComponent(String(docId))}`,
    });

  return (
    <>
      <style href="payload-relations-graph-references" precedence="default">
        {REFERENCES_CSS}
      </style>
      <button
        aria-haspopup="dialog"
        className={triggerClass}
        onClick={() => openModal(drawerSlug)}
        title={
          state.status === "error"
            ? `Could not load references: ${state.message}`
            : "Documents that reference this one"
        }
        type="button"
      >
        <span aria-hidden="true" className="rg-refs__dot" />
        Used in <span className="rg-refs__count">{triggerLabel(state)}</span>
      </button>
      <Drawer slug={drawerSlug} title="Where is this used?">
        <div className="rg-refs">
          <div className="rg-refs__toolbar">
            <p className="rg-refs__summary">
              {state.status === "loading" && "Looking for references…"}
              {state.status === "error" && `Could not load references: ${state.message}`}
              {state.status === "ready" &&
                (total > 0
                  ? `${plural(total, "reference", "references")} across ${plural(
                      groupBySource(state.result.groups).length,
                      "source",
                      "sources"
                    )}.`
                  : "Nothing references this document.")}
            </p>
            <button
              className="rg-refs__refresh"
              disabled={state.status === "loading"}
              onClick={() => void load()}
              type="button"
            >
              Refresh
            </button>
          </div>

          {state.status === "ready" && state.result.groups.length === 0 && (
            <p className="rg-refs__empty">
              No other document or global points at this one through a relationship or upload field
              you can read.
            </p>
          )}

          {state.status === "ready" &&
            groupBySource(state.result.groups).map((section) => {
              const [first] = section.groups;
              if (!first) {
                return null;
              }
              return (
                <section className="rg-refs__source" key={section.key}>
                  <h3 className="rg-refs__source-head">
                    {first.source.label}
                    {first.source.kind === "global" && (
                      <span className="rg-refs__badge">Global</span>
                    )}
                  </h3>
                  {section.groups.map((group) => {
                    const more = group.totalDocs - group.docs.length;
                    return (
                      <div className="rg-refs__field" key={group.field.path}>
                        <div className="rg-refs__field-head">
                          <code className="rg-refs__path">{group.field.path}</code>
                          {group.field.type === "upload" && (
                            <span className="rg-refs__badge">upload</span>
                          )}
                          {group.field.hasMany && <span className="rg-refs__badge">has many</span>}
                          {group.field.polymorphic && (
                            <span className="rg-refs__badge">polymorphic</span>
                          )}
                          {group.field.localized && (
                            <span className="rg-refs__badge">localized</span>
                          )}
                          {!group.error && first.source.kind === "collection" && (
                            <span className="rg-refs__field-count">
                              {group.approximate ? "at least " : ""}
                              {plural(group.totalDocs, "document", "documents")}
                            </span>
                          )}
                        </div>
                        {group.error ? (
                          <p className="rg-refs__error">
                            Could not check this field: {group.error}
                          </p>
                        ) : (
                          <ul className="rg-refs__docs">
                            {group.docs.map((doc) => (
                              <li className="rg-refs__doc" key={String(doc.id)}>
                                <Link href={docHref(group, doc.id)} prefetch={false}>
                                  {doc.title}
                                </Link>
                                {doc.draftOnly && (
                                  <span
                                    className="rg-refs__badge rg-refs__badge--draft"
                                    title="Only the latest draft references this document"
                                  >
                                    draft only
                                  </span>
                                )}
                              </li>
                            ))}
                          </ul>
                        )}
                        {more > 0 && (
                          <p className="rg-refs__more">
                            {group.approximate ? `At least ${more} more` : `+${more} more`}
                          </p>
                        )}
                        {group.partial && (
                          <p className="rg-refs__note">
                            Only part of this collection was checked; there may be more.
                          </p>
                        )}
                      </div>
                    );
                  })}
                </section>
              );
            })}

          <p className="rg-refs__footnote">
            Checks relationship and upload fields in every locale, published and latest draft. Links
            inside rich text are not included.
          </p>
        </div>
      </Drawer>
    </>
  );
};
