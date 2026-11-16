import { stripMarkers } from "@focus-reactive/payload-plugin-visual-editing";
import type {
  SerializedBlockNode,
  SerializedHeadingNode,
  SerializedLinkNode,
  SerializedTableCellNode,
  SerializedTableNode,
  SerializedTableRowNode,
  SerializedTextNode,
  SerializedUploadNode,
} from "@payloadcms/richtext-lexical";
import type {
  SerializedEditorState,
  SerializedLexicalNode,
} from "@payloadcms/richtext-lexical/lexical";
import { RichText } from "@payloadcms/richtext-lexical/react";
import type { JSXConvertersFunction } from "@payloadcms/richtext-lexical/react";
import React from "react";

import { SiteButton } from "@/components/site/SiteButton";
import { SiteImage } from "@/components/site/SiteImage";
import { hasRichText } from "@/components/site/SiteRichText";
import { withLocalePrefix } from "@/lib/config/entityRoutes";
import { localizeHref, routedDocPath } from "@/lib/site/links";
import type { RoutedDocRef } from "@/lib/site/links";
import type { ArticleButtonBlock, Media } from "@/payload-types";

type RichTextValue = { root: unknown; [key: string]: unknown } | null | undefined;

const FORMAT_BOLD = 1;
const FORMAT_ITALIC = 2;
const FORMAT_UNDERLINE = 8;

function renderText({ text, format = 0 }: SerializedTextNode): React.ReactNode {
  let element: React.ReactNode = text;

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

const plainText = (node: SerializedLexicalNode): string => {
  if (node.type === "text") {
    return (node as SerializedTextNode).text;
  }

  const { children } = node as { children?: SerializedLexicalNode[] };

  return (children ?? []).map(plainText).join("");
};

export interface ArticleHeading {
  id: string;
  text: string;
}

const headingId = (index: number): string => `tc-header-${index + 1}`;

const topHeadings = (data: RichTextValue): SerializedHeadingNode[] =>
  hasRichText(data)
    ? (data.root.children as SerializedLexicalNode[]).filter(
        (node): node is SerializedHeadingNode =>
          node.type === "heading" && (node as SerializedHeadingNode).tag === "h2"
      )
    : [];

/** The article's h2 headings, which the "In this article" list links to. */
export function articleHeadings(data: RichTextValue): ArticleHeading[] {
  return topHeadings(data).map((node, index) => ({ id: headingId(index), text: plainText(node) }));
}

export const nextHeadingId = (headings: ArticleHeading[]): string => headingId(headings.length);

// The site's article tables share one look, written inline on every cell.
const TABLE_STYLE = { borderCollapse: "collapse", marginBottom: "20px", width: "100%" } as const;
const RULE = "1px solid black";

function cellStyle(
  cell: SerializedTableCellNode,
  { isFirstColumn, isFirstRow, isLastRow }: Record<string, boolean>
): React.CSSProperties {
  if (cell.headerState > 0) {
    return {
      borderBottom: RULE,
      fontSize: "1.1em",
      fontWeight: 700,
      padding: "12px 16px",
      textAlign: "left",
    };
  }

  return {
    borderBottom: isLastRow ? undefined : RULE,
    borderRight: isFirstColumn ? RULE : undefined,
    fontWeight: isFirstColumn ? 700 : undefined,
    padding: "10px 16px",
    width: isFirstColumn && isFirstRow ? "220px" : undefined,
  };
}

const buildConverters =
  (locale: string, headings: SerializedHeadingNode[]): JSXConvertersFunction =>
  ({ defaultConverters }) => ({
    ...defaultConverters,
    blocks: {
      artButton: ({ node }: { node: SerializedBlockNode<ArticleButtonBlock> }) => (
        <p>
          <SiteButton
            button={node.fields.button}
            className={node.fields.align === "center" ? "button center" : "button"}
            locale={locale}
          />
        </p>
      ),
    },
    heading: ({ node, nodesToJSX }: { node: SerializedHeadingNode; nodesToJSX: NodesToJsx }) => {
      const Tag = node.tag;
      const index = headings.indexOf(node);
      const children = nodesToJSX({ nodes: node.children });

      return index === -1 ? (
        <Tag>{children}</Tag>
      ) : (
        <Tag className="tc-header-landing" id={headingId(index)}>
          {children}
        </Tag>
      );
    },
    link: ({ node, nodesToJSX }: { node: SerializedLinkNode; nodesToJSX: NodesToJsx }) => {
      const { fields } = node;
      const internalPath =
        fields.linkType === "internal" ? routedDocPath(fields.doc as RoutedDocRef) : null;
      const href = internalPath
        ? withLocalePrefix(internalPath, locale)
        : localizeHref(stripMarkers(fields.url) ?? "", locale);

      return (
        <a href={href} {...(fields.newTab ? { rel: "noopener noreferrer", target: "_blank" } : {})}>
          {nodesToJSX({ nodes: node.children })}
        </a>
      );
    },
    table: ({ node, nodesToJSX }: { node: SerializedTableNode; nodesToJSX: NodesToJsx }) => {
      const rows = node.children as SerializedTableRowNode[];

      return (
        <table style={TABLE_STYLE}>
          <tbody>
            {rows.map((row, rowIndex) => (
              <tr key={rowIndex}>
                {(row.children as SerializedTableCellNode[]).map((cell, cellIndex) => {
                  const Cell = cell.headerState > 0 ? "th" : "td";
                  const content = (cell.children as { children?: SerializedLexicalNode[] }[]).map(
                    (paragraph, paragraphIndex) => (
                      <React.Fragment key={paragraphIndex}>
                        {nodesToJSX({ nodes: paragraph.children ?? [] })}
                      </React.Fragment>
                    )
                  );

                  return (
                    <Cell
                      colSpan={cell.colSpan && cell.colSpan > 1 ? cell.colSpan : undefined}
                      key={cellIndex}
                      style={cellStyle(cell, {
                        isFirstColumn: cellIndex === 0,
                        isFirstRow: rowIndex === 1,
                        isLastRow: rowIndex === rows.length - 1,
                      })}
                    >
                      {content}
                    </Cell>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      );
    },
    text: ({ node }: { node: SerializedTextNode }) => renderText(node),
    upload: ({ node }: { node: SerializedUploadNode }) =>
      typeof node.value === "object" ? (
        <figure>
          <SiteImage media={node.value as Media} />
        </figure>
      ) : null,
  });

type NodesToJsx = (args: { nodes: SerializedLexicalNode[] }) => React.ReactNode[];

interface Props {
  data: RichTextValue;
  locale: string;
}

/**
 * An article's text as the site's own markup: bare paragraphs, h2 anchors for the contents list,
 * figures, the comparison tables and buttons.
 */
export function ArticleRichText({ data, locale }: Props) {
  if (!hasRichText(data)) {
    return null;
  }

  return (
    <RichText
      converters={buildConverters(locale, topHeadings(data))}
      data={data as SerializedEditorState}
      disableContainer
    />
  );
}
