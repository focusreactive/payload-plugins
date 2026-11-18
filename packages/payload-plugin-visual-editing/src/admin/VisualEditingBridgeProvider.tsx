"use client";

import { useConfig } from "@payloadcms/ui";
import { useCallback, useEffect, useState } from "react";

import type { VeDocument } from "../shared/protocol.js";

import { adminBaseOf, defaultBuildAdminEditUrl } from "../shared/buildAdminEditUrl.js";
import { announceOpenField } from "../shared/openFieldEvent.js";
import { VE_FOCUS_PARAM, VE_MESSAGE_TYPE } from "../shared/protocol.js";
import type { DocKind } from "../shared/protocol.js";
import type { VeOpenFieldMessage } from "../shared/protocol.js";
import { expandAndFocus } from "./expandAndFocus.js";
import { openDocumentOf } from "./openField/openDocument.js";
import { createOpenForms, currentFormPathOf, OpenFormsContext } from "./openField/openForms.js";
import type { OpenForms } from "./openField/openForms.js";
import { parseFieldPath } from "./parseFieldPath.js";
import { isFromAdminOrPreviewPage, PreviewPagesContext } from "./previewPages.js";
import type { AnnouncePreviewPage, PreviewPage } from "./previewPages.js";
import { resolveContainerChain } from "./resolveContainerChain.js";
import type { ContainerInstruction, ResolverField } from "./resolveContainerChain.js";

const escapeRegex = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const decoded = (segment: string): string => {
  try {
    return decodeURIComponent(segment);
  } catch {
    return segment;
  }
};

const makeLocators = (adminBasePath: string) => {
  const base = escapeRegex(adminBaseOf(adminBasePath));
  const collectionRe = new RegExp(`^${base}/collections/([^/]+)/([^/?#]+)`);
  const globalRe = new RegExp(`^${base}/globals/([^/?#]+)`);

  const currentCollectionLocation = (): { slug: string; id: string } | null => {
    const match = window.location.pathname.match(collectionRe);
    if (!match) return null;
    const [, slug, id] = match;
    if (!slug || !id) return null;
    return { id: decoded(id), slug: decoded(slug) };
  };

  const currentGlobalSlug = (): string | null => {
    const match = window.location.pathname.match(globalRe);
    return match?.[1] ? decoded(match[1]) : null;
  };

  const navigateAndFocus = (message: VeOpenFieldMessage): void => {
    const url = defaultBuildAdminEditUrl({
      adminBasePath,
      collectionSlug: message.collectionSlug,
      docId: message.docId,
      kind: message.kind,
      locale: message.locale,
      path: message.path,
    });
    const opened = window.open(url, "_blank");
    if (!opened) window.location.assign(url);
  };

  return { currentCollectionLocation, currentGlobalSlug, navigateAndFocus };
};

const fallbackResolution = (
  path: string
): { chain: ContainerInstruction[]; fieldId: string | null } => {
  const { rowIds, fieldId } = parseFieldPath(path);
  return {
    chain: rowIds.map((rowContainerId) => ({ kind: "row", rowContainerId }) as const),
    fieldId,
  };
};

type EntityFieldsLookup = (kind: DocKind, slug: string) => ResolverField[] | null;

type FocusTarget = { docId?: string; locale?: string };

const focusFieldPath = async (
  path: string,
  kind: DocKind,
  slug: string,
  getFields: EntityFieldsLookup,
  target: FocusTarget = {}
): Promise<void> => {
  const openedByAnotherComponent = announceOpenField({
    path,
    ...(kind === "collection" ? { collectionSlug: slug } : { globalSlug: slug }),
    ...(target.docId === undefined ? {} : { docId: target.docId }),
    ...(target.locale === undefined ? {} : { locale: target.locale }),
  });
  if (openedByAnotherComponent) return;
  const fields = getFields(kind, slug);
  const chainResult = fields !== null ? resolveContainerChain(path, fields) : null;
  const resolved = chainResult ?? fallbackResolution(path);
  await expandAndFocus(resolved.chain, resolved.fieldId);
};

const forgetFocusParam = (): void => {
  const url = new URL(window.location.href);
  if (!url.searchParams.has(VE_FOCUS_PARAM)) return;
  url.searchParams.delete(VE_FOCUS_PARAM);
  window.history.replaceState(null, "", url.toString());
};

const focusFieldOnceFormIsOpen = async (
  openForms: OpenForms,
  document: VeDocument,
  path: string,
  getFields: EntityFieldsLookup
): Promise<void> => {
  try {
    await openForms.whenOpen(document);
    await focusFieldPath(path, document.kind, document.collectionSlug, getFields, {
      ...(document.docId === undefined ? {} : { docId: document.docId }),
    });
  } finally {
    forgetFocusParam();
  }
};

export function VisualEditingBridgeProvider({
  adminBasePath = "/admin",
  children,
}: {
  adminBasePath?: string;
  children: React.ReactNode;
}) {
  const { getEntityConfig } = useConfig();
  const [openForms] = useState(createOpenForms);
  const [previewPages] = useState(() => new Set<PreviewPage>());
  const [linkedFocus] = useState(() => ({ started: false }));

  const announcePreviewPage = useCallback<AnnouncePreviewPage>(
    (page) => {
      previewPages.add(page);
      return () => {
        previewPages.delete(page);
      };
    },
    [previewPages]
  );

  useEffect(() => {
    const { currentCollectionLocation, currentGlobalSlug, navigateAndFocus } =
      makeLocators(adminBasePath);

    const documentOfLocation = (): VeDocument | null =>
      openDocumentOf({
        collectionSlug: currentCollectionLocation()?.slug,
        globalSlug: currentGlobalSlug() ?? undefined,
        id: currentCollectionLocation()?.id,
      });

    const getFields: EntityFieldsLookup = (kind, slug) => {
      try {
        const entity =
          kind === "collection"
            ? getEntityConfig({ collectionSlug: slug })
            : getEntityConfig({ globalSlug: slug });
        return (entity?.fields ?? null) as ResolverField[] | null;
      } catch {
        return null;
      }
    };

    const focusPath = new URL(window.location.href).searchParams.get(VE_FOCUS_PARAM);
    const linked = documentOfLocation();
    if (focusPath && !linked) forgetFocusParam();
    if (focusPath && linked && !linkedFocus.started) {
      linkedFocus.started = true;
      void focusFieldOnceFormIsOpen(openForms, linked, focusPath, getFields);
    }

    const handle = (event: MessageEvent) => {
      if (!isFromAdminOrPreviewPage(event, window.location.origin, previewPages)) return;
      const data = event.data as VeOpenFieldMessage | undefined;
      if (!data || data.type !== VE_MESSAGE_TYPE) return;

      if (data.kind === "collection") {
        const current = currentCollectionLocation();
        const wrongCollection = current?.slug !== data.collectionSlug;
        const wrongDoc = data.docId !== undefined && current?.id !== data.docId;
        if (!current || wrongCollection || wrongDoc) {
          navigateAndFocus(data);
          return;
        }
        void focusFieldPath(
          currentFormPathOf(data, openForms.forms),
          "collection",
          data.collectionSlug,
          getFields,
          { docId: current.id, locale: data.locale }
        );
        return;
      }

      if (data.kind === "global") {
        const slug = currentGlobalSlug();
        if (slug !== data.collectionSlug) {
          navigateAndFocus(data);
          return;
        }
        void focusFieldPath(
          currentFormPathOf(data, openForms.forms),
          "global",
          data.collectionSlug,
          getFields,
          { locale: data.locale }
        );
      }
    };

    window.addEventListener("message", handle);
    return () => window.removeEventListener("message", handle);
  }, [getEntityConfig, adminBasePath, openForms, previewPages, linkedFocus]);

  return (
    <PreviewPagesContext.Provider value={announcePreviewPage}>
      <OpenFormsContext.Provider value={openForms.announce}>{children}</OpenFormsContext.Provider>
    </PreviewPagesContext.Provider>
  );
}
