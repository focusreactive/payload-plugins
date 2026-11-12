import {
  MAX_LINKED_DOCS,
  MAX_LINKED_HREFS,
  MAX_LINKED_HREF_LENGTH,
  MAX_LINK_TEXT_CHARS,
} from "../../constants";
import { siteOf, toPath } from "../../links/toPath";
import { docTargetKey } from "../../keyphrases/docTarget";
import { readDocTarget } from "../keyphrases/docRef";

export interface LinkedHref {
  site: string | null;
  path: string;
}

export interface LinkRequest {
  text: string;
  linkedHrefs: LinkedHref[];
  linkedDocs: Set<string>;
}

function isCappedList(value: unknown, cap: number): value is unknown[] {
  return Array.isArray(value) && value.length <= cap;
}

function readHrefs(value: unknown): string[] | null {
  if (value === undefined) return [];
  if (!isCappedList(value, MAX_LINKED_HREFS)) return null;

  const hrefs = value.filter(
    (href): href is string => typeof href === "string" && href.length <= MAX_LINKED_HREF_LENGTH
  );

  return hrefs.length === value.length ? hrefs : null;
}

function readLinkedDocs(value: unknown, collections: string[]): Set<string> | null {
  if (value === undefined) return new Set();
  if (!isCappedList(value, MAX_LINKED_DOCS)) return null;

  return new Set(
    value.flatMap((item) => {
      const target = readDocTarget(item, collections);
      return target ? [docTargetKey(target.collection, target.docId)] : [];
    })
  );
}

function toLinkedHrefs(hrefs: string[]): LinkedHref[] {
  return hrefs.flatMap((href) => {
    const path = toPath(href);

    return path === null ? [] : [{ site: siteOf(href), path }];
  });
}

export function readLinkRequest(
  body: Record<string, unknown>,
  collections: string[]
): LinkRequest | null {
  const { text } = body;
  if (typeof text !== "string" || text.length > MAX_LINK_TEXT_CHARS) return null;

  const hrefs = readHrefs(body.linkedHrefs);
  const linkedDocs = readLinkedDocs(body.linkedDocs, collections);
  if (!hrefs || !linkedDocs) return null;

  return { text, linkedHrefs: toLinkedHrefs(hrefs), linkedDocs };
}
