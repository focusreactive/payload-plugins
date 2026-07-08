import type { DefaultNodeTypes, SerializedLinkNode } from "@payloadcms/richtext-lexical";
import type { SerializedEditorState } from "@payloadcms/richtext-lexical/lexical";
import type { JSXConverterArgs, JSXConvertersFunction } from "@payloadcms/richtext-lexical/react";
import {
  LinkJSXConverter,
  ListJSXConverter,
  RichText as RichTextReact,
} from "@payloadcms/richtext-lexical/react";
import { withVisualEditingPath } from "@fr-private/payload-plugin-visual-editing/client";
import { Check } from "lucide-react";
import { Media } from "@/components/media";

import { CardsGridInlineComponent } from "@/blocks/CardsGrid/InlineComponent";
import { CodeInlineComponent } from "@/blocks/Code/InlineComponent";
import { CtaBannerInlineComponent } from "@/blocks/CtaBanner/InlineComponent";
import { LogosInlineComponent } from "@/blocks/Logos/InlineComponent";
import { BLOG_CONFIG } from "@/lib/config/blog";
import { cn } from "@/components/utils";
import { proseVariants } from "@/components/richText/proseVariants";
import type { ProseVariant } from "@/components/richText/proseVariants";
import { prepareMediaProps } from "@/lib/adapters/prepareMediaProps";
import type { Media as MediaDoc } from "@/payload-types";

type UploadNodeWithAspectRatio = DefaultNodeTypes & {
  type: "upload";
  value?: unknown;
  fields?: { aspectRatio?: string | null };
};

type NodeTypes = DefaultNodeTypes | UploadNodeWithAspectRatio;

const internalDocToHref = ({ linkNode }: { linkNode: SerializedLinkNode }): string => {
  const { value, relationTo } = linkNode.fields.doc!;
  if (typeof value !== "object") {
    throw new TypeError("Expected value to be an object");
  }
  const { slug } = value;
  return relationTo === "posts" ? `${BLOG_CONFIG.basePath}/${slug}` : `/${slug}`;
};

const createJsxConverters =
  (variant?: ProseVariant): JSXConvertersFunction<NodeTypes> =>
  ({ defaultConverters }) => ({
    ...defaultConverters,
    ...LinkJSXConverter({ internalDocToHref }),
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

export const RichText = ({
  content,
  className,
  variant,
}: {
  content: SerializedEditorState;
  className?: string;
  variant?: ProseVariant;
}) => {
  if (!content) {
    return null;
  }

  return (
    <div {...withVisualEditingPath(content)}>
      <RichTextReact
        className={cn(proseVariants({ variant }), className)}
        converters={createJsxConverters(variant)}
        data={content}
      />
    </div>
  );
};
