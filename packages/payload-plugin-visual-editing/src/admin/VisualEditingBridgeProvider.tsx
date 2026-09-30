"use client";

import { useConfig } from "@payloadcms/ui";
import { useEffect } from "react";

import { VE_MESSAGE_TYPE } from "../constants.js";
import type { VeOpenFieldMessage } from "../constants.js";
import { expandAndFocus } from "./expandAndFocus.js";
import { parseFieldPath } from "./parseFieldPath.js";
import { resolveContainerChain } from "./resolveContainerChain.js";
import type { ContainerInstruction, ResolverField } from "./resolveContainerChain.js";

const VE_FOCUS_PARAM = "veFocus";

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
    const target =
      message.kind === "global"
        ? `${adminBasePath}/globals/${message.collectionSlug}`
        : `${adminBasePath}/collections/${message.collectionSlug}/${message.docId}`;
    const params = new URLSearchParams();
    if (message.path) params.set(VE_FOCUS_PARAM, message.path);
    if (message.locale) params.set("locale", message.locale);
    const qs = params.toString();
    const url = qs ? `${target}?${qs}` : target;
    // Different doc => new tab so the current admin context is preserved.
    // Same-doc field focus goes through `focusFieldPath`, not this helper.
    // `noopener` here would force the return value to null, defeating the
    // popup-block detection below. We're same-origin (admin -> admin), so
    // the retained opener reference isn't a security concern.
    const opened = window.open(url, "_blank");
    if (!opened) window.location.assign(url);
  };

  return { currentCollectionLocation, currentGlobalSlug, navigateAndFocus };
};

// If the schema walk fails (drift, malformed path), reconstruct a row-only
// chain from numeric segments in the path — matches the pre-resolver behavior.
const fallbackResolution = (
  path: string
): { chain: ContainerInstruction[]; fieldId: string | null } => {
  const { rowIds, fieldId } = parseFieldPath(path);
  return {
    chain: rowIds.map((rowContainerId) => ({ kind: "row", rowContainerId }) as const),
    fieldId,
  };
};

type EntityFieldsLookup = (kind: "collection" | "global", slug: string) => ResolverField[] | null;

const focusFieldPath = async (
  path: string,
  kind: "collection" | "global",
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

    // URL-param activation: strip `veFocus` from URL, then defer to give the
    // admin form time to paint.
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

      // Collection mismatch: navigate to the correct (collection, doc) pair —
      // compare BOTH slug and id. Two collections can share an id (pages/1 vs
      // forms/1), so matching on id alone would leave the user on the wrong
      // edit view and every field lookup would fail.
      if (data.kind === "collection") {
        const current = currentCollectionLocation();
        const wrongCollection = current?.slug !== data.collectionSlug;
        const wrongDoc = data.docId !== undefined && current?.id !== data.docId;
        if (!current || wrongCollection || wrongDoc) {
          navigateAndFocus(data);
          return;
        }
        void focusFieldPath(data.path, "collection", data.collectionSlug, getFields);
        return;
      }

      if (data.kind === "global") {
        const slug = currentGlobalSlug();
        if (slug !== data.collectionSlug) {
          navigateAndFocus(data);
          return;
        }
        void focusFieldPath(data.path, "global", data.collectionSlug, getFields);
      }
    };

    window.addEventListener("message", handle);
    return () => window.removeEventListener("message", handle);
  }, [getEntityConfig, adminBasePath]);

  return <>{children}</>;
}
