import type { DefaultNodeTypes, SerializedLinkNode } from "@payloadcms/richtext-lexical";
import type { SerializedEditorState } from "@payloadcms/richtext-lexical/lexical";
import type { JSXConverterArgs, JSXConvertersFunction } from "@payloadcms/richtext-lexical/react";
import {
  LinkJSXConverter,
  ListJSXConverter,
  RichText as RichTextReact,
} from "@payloadcms/richtext-lexical/react";
import { withVisualEditingPath } from "@focus-reactive/payload-plugin-visual-editing/client";
import { Check } from "lucide-react";
import { Media } from "@/components/media";

import { CardsGridInlineComponent } from "@/blocks/CardsGrid/InlineComponent";
import { CodeInlineComponent } from "@/blocks/Code/InlineComponent";
import { CtaBannerInlineComponent } from "@/blocks/CtaBanner/InlineComponent";
import { LogosInlineComponent } from "@/blocks/Logos/InlineComponent";
import { cn } from "@/components/utils";
import { proseVariants } from "@/components/richText/proseVariants";
import type { ProseVariant } from "@/components/richText/proseVariants";
import { prepareMediaProps } from "@/lib/adapters/prepareMediaProps";
import type { Locale } from "@/lib/types";
import { getDocumentPath } from "@/lib/utils/path/getDocumentPath";
import { localizePath } from "@/lib/utils/path/localizePath";
import type { Media as MediaDoc } from "@/payload-types";

type UploadNodeWithAspectRatio = DefaultNodeTypes & {
  type: "upload";
  value?: unknown;
  fields?: { aspectRatio?: string | null };
};

type NodeTypes = DefaultNodeTypes | UploadNodeWithAspectRatio;

const createInternalDocToHref =
  (locale: Locale) =>
  ({ linkNode }: { linkNode: SerializedLinkNode }): string => {
    const path = getDocumentPath(linkNode.fields.doc!);
    if (!path) {
      throw new TypeError("Expected a populated document");
    }

    return localizePath(path, locale);
  };

const createJsxConverters =
  (locale: Locale, variant?: ProseVariant): JSXConvertersFunction<NodeTypes> =>
  ({ defaultConverters }) => ({
    ...defaultConverters,
    ...LinkJSXConverter({ internalDocToHref: createInternalDocToHref(locale) }),
    ...(variant === "content"
      ? {
          listitem: (args: JSXConverterArgs<Extract<DefaultNodeTypes, { type: "listitem" }>>) => {
            const { node, parent, nodesToJSX } = args;
            const isBullet = (parent as { listType?: string }).listType === "bullet";
            const hasSubLists = node.children.some((child) => child.type === "list");

            if (!isBullet || hasSubLists) {
              const fallback = ListJSXConverter.listitem;
              return typeof fallback === "function" ? fallback(args) : null;
            }

            return (
              <li>
                <Check aria-hidden className="prose-content-check" />
                {nodesToJSX({ nodes: node.children })}
              </li>
            );
          },
        }
      : {}),
    blocks: {
      /* eslint-disable @typescript-eslint/no-explicit-any */
      cardsGridInline: ({ node }: { node: any }) => (
        <CardsGridInlineComponent {...(node.fields as any)} />
      ),
      logosInline: ({ node }: { node: any }) => <LogosInlineComponent {...(node.fields as any)} />,
      codeInline: ({ node }: { node: any }) => <CodeInlineComponent {...(node.fields as any)} />,
      ctaBannerInline: ({ node }: { node: any }) => (
        <CtaBannerInlineComponent {...(node.fields as any)} />
      ),
      /* eslint-enable @typescript-eslint/no-explicit-any */
    },
    upload: ({ node }) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const uploadNode = node as any;
      const media = typeof uploadNode.value === "object" ? (uploadNode.value as MediaDoc) : null;
      const aspectRatio = uploadNode.fields?.aspectRatio ?? null;
      const prepared = prepareMediaProps({ aspectRatio, image: media });
      const isAuto = !aspectRatio || aspectRatio === "auto";

      return (
        <Media
          {...prepared.data}
          className={cn("my-6 overflow-hidden rounded-xl", isAuto && "w-fit")}
          visualEditing={prepared.visualEditing}
          imageProps={prepared.imageProps}
        />
      );
    },
  });

export type RichTextStyle = {
  className?: string;
  variant?: ProseVariant;
};

export type RichTextRenderOptions = RichTextStyle & {
  locale: Locale;
};

export type RichTextProps = RichTextStyle & {
  content: SerializedEditorState;
};

type RichTextBodyProps = RichTextRenderOptions & {
  content: SerializedEditorState;
};

export const RichTextBody = ({ content, className, locale, variant }: RichTextBodyProps) => (
  <div {...withVisualEditingPath(content)}>
    <RichTextReact
      className={cn(proseVariants({ variant }), className)}
      converters={createJsxConverters(locale, variant)}
      data={content}
    />
  </div>
);
