import type {
  SerializedEditorState,
  SerializedLexicalNode,
} from "@payloadcms/richtext-lexical/lexical";
import { LinkJSXConverter, RichText } from "@payloadcms/richtext-lexical/react";
import type { JSXConvertersFunction } from "@payloadcms/richtext-lexical/react";
import React from "react";

import { withLocalePrefix } from "@/lib/config/entityRoutes";
import { routedDocPath } from "@/lib/site/links";
import type { RoutedDocRef } from "@/lib/site/links";

type RichTextValue =
  | SerializedEditorState
  | { root: unknown; [key: string]: unknown }
  | null
  | undefined;

interface TextNode extends SerializedLexicalNode {
  type: "text";
  text: string;
  format?: number;
}

const FORMAT_BOLD = 1;
const FORMAT_ITALIC = 2;
const FORMAT_UNDERLINE = 8;

// The site's stylesheet targets `em`, `strong` and `u` inside headings, so marks render as those
// elements and not as the styled spans the default converter emits.
function renderText(node: TextNode): React.ReactNode {
  const format = node.format ?? 0;
  let element: React.ReactNode = node.text;

  if (format & FORMAT_BOLD) {
    element = <strong>{element}</strong>;
  }
  if (format & FORMAT_ITALIC) {
    element = <em>{element}</em>;
  }
  if (format & FORMAT_UNDERLINE) {
    element = <u>{element}</u>;
  }

  return element;
}

const buildConverters =
  (locale: string): JSXConvertersFunction =>
  ({ defaultConverters }) => ({
    ...defaultConverters,
    ...LinkJSXConverter({
      internalDocToHref: ({ linkNode }) => {
        const { relationTo, value } = linkNode.fields.doc ?? {};
        const path = routedDocPath({ relationTo, value } as RoutedDocRef);

        return path ? withLocalePrefix(path, locale) : "#";
      },
    }),
    text: ({ node }) => renderText(node as TextNode),
  });

export function hasRichText(data: RichTextValue): data is SerializedEditorState {
  const root = (data as SerializedEditorState | null | undefined)?.root;

  if (!root?.children?.length) {
    return false;
  }

  return root.children.some((child) => {
    const children = (child as { children?: unknown[] }).children;

    return child.type !== "paragraph" || (children?.length ?? 0) > 0;
  });
}

interface Props {
  data: RichTextValue;
  locale: string;
}

/** Running text as bare `p`, `ul`, `h3` and `a` elements with no wrapper, for the site's CSS. */
export function SiteRichText({ data, locale }: Props) {
  if (!hasRichText(data)) {
    return null;
  }

  return <RichText converters={buildConverters(locale)} data={data} disableContainer />;
}

/** The first paragraph's content with no block element around it, for use inside a heading. */
export function InlineRichText({ data }: Pick<Props, "data">) {
  if (!hasRichText(data)) {
    return null;
  }

  const [firstBlock] = data.root.children as { children?: SerializedLexicalNode[] }[];

  return (
    <>
      {(firstBlock?.children ?? []).map((node, index) =>
        node.type === "linebreak" ? (
          <br key={index} />
        ) : (
          <React.Fragment key={index}>{renderText(node as TextNode)}</React.Fragment>
        )
      )}
    </>
  );
}
