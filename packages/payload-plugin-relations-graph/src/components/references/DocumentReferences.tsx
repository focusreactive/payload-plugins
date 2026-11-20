"use client";

import {
  Banner,
  Button,
  Drawer,
  Link,
  Pill,
  ShimmerEffect,
  useConfig,
  useDocumentInfo,
  useDrawerSlug,
  useModal,
} from "@payloadcms/ui";
import { formatAdminURL } from "payload/shared";
import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from "react";

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
  const sections = state.status === "ready" ? groupBySource(state.result.groups) : [];

  const docHref = (group: ReferenceGroup, docId: number | string): string =>
    formatAdminURL({
      adminRoute,
      path:
        group.source.kind === "global"
          ? `/globals/${group.source.slug}`
          : `/collections/${group.source.slug}/${encodeURIComponent(String(docId))}`,
    });

  const summary = (): string => {
    if (state.status === "loading") {
      return "Looking for references…";
    }
    if (state.status === "error") {
      return "References could not be loaded.";
    }
    return total > 0
      ? `${plural(total, "reference", "references")} across ${plural(sections.length, "source", "sources")}.`
      : "Nothing references this document.";
  };

  return (
    <>
      <style href="payload-relations-graph-references" precedence="default">
        {REFERENCES_CSS}
      </style>
      <Button
        buttonStyle="secondary"
        className="rg-refs__trigger"
        extraButtonProps={{ "aria-haspopup": "dialog" }}
        margin={false}
        onClick={() => openModal(drawerSlug)}
        size="medium"
        tooltip={
          state.status === "error" ? `Could not load references: ${state.message}` : undefined
        }
      >
        Used in <span className="rg-refs__count">{triggerLabel(state)}</span>
      </Button>
      <Drawer slug={drawerSlug} title="Where is this used?">
        <div className="rg-refs">
          <div className="rg-refs__toolbar">
            <p className="rg-refs__summary">{summary()}</p>
            <Button
              buttonStyle="secondary"
              disabled={state.status === "loading"}
              margin={false}
              onClick={() => void load()}
              size="small"
            >
              Refresh
            </Button>
          </div>

          {state.status === "loading" && (
            <div className="rg-refs__loading">
              <ShimmerEffect height={40} />
              <ShimmerEffect animationDelay="120ms" height={40} />
              <ShimmerEffect animationDelay="240ms" height={40} />
            </div>
          )}

          {state.status === "error" && <Banner type="error">{state.message}</Banner>}

          {state.status === "ready" && sections.length === 0 && (
            <Banner type="default">
              No other document or global points at this one through a relationship or upload field
              you can read.
            </Banner>
          )}

          {sections.map((section) => {
            const [first] = section.groups;
            if (!first) {
              return null;
            }
            const sectionTotal = section.groups.reduce((sum, group) => sum + group.totalDocs, 0);
            return (
              <section className="rg-refs__source" key={section.key}>
                <h3 className="rg-refs__source-head">
                  {first.source.label}
                  {first.source.kind === "global" && (
                    <Pill pillStyle="light-gray" size="small">
                      Global
                    </Pill>
                  )}
                  <Pill pillStyle="light-gray" size="small">
                    {sectionTotal}
                  </Pill>
                </h3>
                {section.groups
                  .filter((group) => group.error)
                  .map((group) => (
                    <Banner key={group.field.path} type="error">
                      Could not check <code className="rg-refs__path">{group.field.path}</code>:{" "}
                      {group.error}
                    </Banner>
                  ))}
                {section.groups
                  .filter((group) => group.partial)
                  .map((group) => (
                    <Banner key={group.field.path} type="warning">
                      Only part of {first.source.label} was checked for{" "}
                      <code className="rg-refs__path">{group.field.path}</code>; there may be more.
                    </Banner>
                  ))}
                {section.groups.some((group) => group.docs.length > 0) && (
                  <div className="table">
                    <table cellPadding={0} cellSpacing={0}>
                      <thead>
                        <tr>
                          <th className="rg-refs__col-doc">
                            {first.source.kind === "global" ? "Global" : "Document"}
                          </th>
                          <th>Field</th>
                        </tr>
                      </thead>
                      <tbody>
                        {section.groups.map((group) => {
                          const more = group.totalDocs - group.docs.length;
                          return (
                            <Fragment key={group.field.path}>
                              {group.docs.map((doc) => (
                                <tr key={`${group.field.path}:${String(doc.id)}`}>
                                  <td>
                                    <span className="rg-refs__doc">
                                      <Link href={docHref(group, doc.id)} prefetch={false}>
                                        {doc.title}
                                      </Link>
                                      {doc.draftOnly && (
                                        <Pill pillStyle="warning" size="small">
                                          Draft only
                                        </Pill>
                                      )}
                                    </span>
                                  </td>
                                  <td>
                                    <code className="rg-refs__path">{group.field.path}</code>
                                  </td>
                                </tr>
                              ))}
                              {more > 0 && (
                                <tr>
                                  <td className="rg-refs__more" colSpan={2}>
                                    {group.approximate ? `At least ${more}` : `+${more}`} more via{" "}
                                    <code className="rg-refs__path">{group.field.path}</code>
                                  </td>
                                </tr>
                              )}
                            </Fragment>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
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
