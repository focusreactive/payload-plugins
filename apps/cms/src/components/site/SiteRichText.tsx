import type {
  SerializedEditorState,
  SerializedLexicalNode,
} from "@payloadcms/richtext-lexical/lexical";
import { withVisualEditingPath } from "@focus-reactive/payload-plugin-visual-editing/client";
import { LinkJSXConverter, RichText } from "@payloadcms/richtext-lexical/react";
import type { JSXConverters, JSXConvertersFunction } from "@payloadcms/richtext-lexical/react";
import React from "react";

import { withLocalePrefix } from "@/lib/config/entityRoutes";
import { localizeHref, routedDocPath } from "@/lib/site/links";
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

interface ListNode extends SerializedLexicalNode {
  children: SerializedLexicalNode[];
  listType?: string;
  tag?: string;
}

type Converter = JSXConverters[string];
type ConverterArgs = Parameters<Extract<Converter, (...args: never[]) => unknown>>[0];

const runConverter = (converter: Converter, args: ConverterArgs): React.ReactNode =>
  typeof converter === "function" ? converter(args) : (converter as React.ReactNode);

const isPlainList = (node: SerializedLexicalNode | undefined): boolean =>
  (node as ListNode | undefined)?.listType !== "check";

/**
 * Bare `ul`, `ol` and `li` as the site's stylesheet expects, and a path on this site typed as a URL
 * gets the page's locale, as a link field does.
 */
const buildConverters =
  (locale: string): JSXConvertersFunction =>
  ({ defaultConverters }) => {
    const linkConverters = LinkJSXConverter({
      internalDocToHref: ({ linkNode }) => {
        const { relationTo, value } = linkNode.fields.doc ?? {};
        const path = routedDocPath({ relationTo, value } as RoutedDocRef);

        return path ? withLocalePrefix(path, locale) : "#";
      },
    });

    return {
      ...defaultConverters,
      ...linkConverters,
      link: (args) => {
        const element = runConverter(linkConverters.link, args);
        const { fields } = args.node as { fields?: { linkType?: string; url?: string } };
        const url = fields?.linkType === "internal" ? undefined : fields?.url;

        return url?.startsWith("/") && React.isValidElement(element)
          ? React.cloneElement(element as React.ReactElement<{ href?: string }>, {
              href: localizeHref(url, locale),
            })
          : element;
      },
      list: (args) => {
        const node = args.node as ListNode;

        if (!isPlainList(node)) {
          return runConverter(defaultConverters.list, args);
        }

        const ListTag = node.tag === "ol" ? "ol" : "ul";

        return <ListTag>{args.nodesToJSX({ nodes: node.children })}</ListTag>;
      },
      listitem: (args) => {
        const node = args.node as ListNode;
        const hasSubList = node.children.some((child) => child.type === "list");

        if (hasSubList || !isPlainList(args.parent)) {
          return runConverter(defaultConverters.listitem, args);
        }

        return <li>{args.nodesToJSX({ nodes: node.children })}</li>;
      },
      text: ({ node }) => renderText(node as TextNode),
    };
  };

/**
 * The visual-editing attributes of a rich text field, for the element that already holds its
 * text, such as the heading around `InlineRichText`. Empty outside a draft preview.
 */
export const richTextTarget = (data: unknown) => withVisualEditingPath(data);

/**
 * The overlay frames rich text only inside an element carrying the field's attributes, and the
 * site's stylesheet allows no wrapper, so each top-level element the converters already emit
 * carries them instead.
 */
export function withTopLevelTarget(
  converters: JSXConvertersFunction,
  data: unknown
): JSXConvertersFunction {
  const attributes = richTextTarget(data);

  if (Object.keys(attributes).length === 0) {
    return converters;
  }

  return (args) => {
    const built = converters(args);
    const targeted: JSXConverters = { ...built };

    for (const [type, converter] of Object.entries(built)) {
      if (typeof converter !== "function") {
        continue;
      }

      targeted[type] = ((converterArgs: ConverterArgs) => {
        const element = (converter as (input: ConverterArgs) => React.ReactNode)(converterArgs);

        return converterArgs.parent?.type === "root" && React.isValidElement(element)
          ? React.cloneElement(element, attributes)
          : element;
      }) as Converter;
    }

    return targeted;
  };
}

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

  return (
    <RichText
      converters={withTopLevelTarget(buildConverters(locale), data)}
      data={data}
      disableContainer
    />
  );
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
