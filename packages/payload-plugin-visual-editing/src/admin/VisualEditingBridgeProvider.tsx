"use client";

import { useConfig } from "@payloadcms/ui";
import { useCallback, useEffect, useState } from "react";

import { defaultBuildAdminEditUrl } from "../shared/buildAdminEditUrl.js";
import { VE_FOCUS_PARAM, VE_MESSAGE_TYPE } from "../shared/protocol.js";
import type { DocKind } from "../shared/protocol.js";
import type { VeOpenFieldMessage } from "../shared/protocol.js";
import { expandAndFocus } from "./expandAndFocus.js";
import { currentFormPathOf, OpenFormsContext } from "./openField/openForms.js";
import type { AnnounceOpenForm, OpenForm } from "./openField/openForms.js";
import { parseFieldPath } from "./parseFieldPath.js";
import { resolveContainerChain } from "./resolveContainerChain.js";
import type { ContainerInstruction, ResolverField } from "./resolveContainerChain.js";

const escapeRegex = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const isSameOrigin = (eventOrigin: string): boolean => {
  if (typeof window === "undefined") return false;
  return eventOrigin === window.location.origin;
};

const makeLocators = (adminBasePath: string) => {
  const base = escapeRegex(adminBasePath);
  const collectionRe = new RegExp(`^${base}/collections/([^/]+)/([^/?#]+)`);
  const globalRe = new RegExp(`^${base}/globals/([^/?#]+)`);

  const currentCollectionLocation = (): { slug: string; id: string } | null => {
    const match = window.location.pathname.match(collectionRe);
    if (!match) return null;
    const [, slug, id] = match;
    if (!slug || !id) return null;
    return { slug, id };
  };

  const currentGlobalSlug = (): string | null => {
    const match = window.location.pathname.match(globalRe);
    return match?.[1] ?? null;
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

const focusFieldPath = async (
  path: string,
  kind: DocKind,
  slug: string,
  getFields: EntityFieldsLookup
): Promise<void> => {
  const fields = getFields(kind, slug);
  const chainResult = fields !== null ? resolveContainerChain(path, fields) : null;
  const resolved = chainResult ?? fallbackResolution(path);
  await expandAndFocus(resolved.chain, resolved.fieldId);
};

export function VisualEditingBridgeProvider({
  adminBasePath = "/admin",
  children,
}: {
  adminBasePath?: string;
  children: React.ReactNode;
}) {
  const { getEntityConfig } = useConfig();
  const [openForms] = useState(() => new Set<OpenForm>());

  const announceOpenForm = useCallback<AnnounceOpenForm>(
    (form) => {
      openForms.add(form);
      return () => {
        openForms.delete(form);
      };
    },
    [openForms]
  );

  useEffect(() => {
    const { currentCollectionLocation, currentGlobalSlug, navigateAndFocus } =
      makeLocators(adminBasePath);

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

    const url = new URL(window.location.href);
    const focusPath = url.searchParams.get(VE_FOCUS_PARAM);
    if (focusPath) {
      url.searchParams.delete(VE_FOCUS_PARAM);
      window.history.replaceState(null, "", url.toString());
      const collection = currentCollectionLocation();
      const globalSlug = currentGlobalSlug();
      setTimeout(() => {
        if (collection) {
          void focusFieldPath(focusPath, "collection", collection.slug, getFields);
        } else if (globalSlug) {
          void focusFieldPath(focusPath, "global", globalSlug, getFields);
        }
      }, 500);
    }

    const handle = (event: MessageEvent) => {
      if (!isSameOrigin(event.origin)) return;
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
          currentFormPathOf(data, openForms),
          "collection",
          data.collectionSlug,
          getFields
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
          currentFormPathOf(data, openForms),
          "global",
          data.collectionSlug,
          getFields
        );
      }
    };

    window.addEventListener("message", handle);
    return () => window.removeEventListener("message", handle);
  }, [getEntityConfig, adminBasePath, openForms]);

  return <OpenFormsContext.Provider value={announceOpenForm}>{children}</OpenFormsContext.Provider>;
}
