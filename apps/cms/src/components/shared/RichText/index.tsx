import type { DefaultNodeTypes, SerializedLinkNode } from "@payloadcms/richtext-lexical";
import type { SerializedEditorState } from "@payloadcms/richtext-lexical/lexical";
import type { JSXConvertersFunction } from "@payloadcms/richtext-lexical/react";
import { LinkJSXConverter, RichText as RichTextReact } from "@payloadcms/richtext-lexical/react";
import { withVisualEditingPath } from "@fr-private/payload-plugin-visual-editing/client";
import { Image } from "@/components/image";

import { CardsGridInlineComponent } from "@/blocks/CardsGrid/InlineComponent";
import { CodeInlineComponent } from "@/blocks/Code/InlineComponent";
import { LogosInlineComponent } from "@/blocks/Logos/InlineComponent";
import { BLOG_CONFIG } from "@/lib/config/blog";
import { cn } from "@/components/utils";
import { proseVariants } from "@/components/richText/proseVariants";
import type { ProseVariant } from "@/components/richText/proseVariants";
import { prepareImageProps } from "@/lib/adapters/prepareImageProps";
import type { Media } from "@/payload-types";

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

const jsxConverters: JSXConvertersFunction<NodeTypes> = ({ defaultConverters }) => ({
  ...defaultConverters,
  ...LinkJSXConverter({ internalDocToHref }),
  blocks: {
    /* eslint-disable @typescript-eslint/no-explicit-any */
    cardsGridInline: ({ node }: { node: any }) => (
      <CardsGridInlineComponent {...(node.fields as any)} />
    ),
    logosInline: ({ node }: { node: any }) => <LogosInlineComponent {...(node.fields as any)} />,
    codeInline: ({ node }: { node: any }) => <CodeInlineComponent {...(node.fields as any)} />,
    /* eslint-enable @typescript-eslint/no-explicit-any */
  },
  upload: ({ node }) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const uploadNode = node as any;
    const media = typeof uploadNode.value === "object" ? (uploadNode.value as Media) : null;
    const aspectRatio = uploadNode.fields?.aspectRatio ?? null;
    const imageProps = prepareImageProps({ aspectRatio, image: media });

    // eslint-disable-next-line jsx-a11y/alt-text
    return <Image {...imageProps} />;
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
        converters={jsxConverters}
        data={content}
      />
    </div>
  );
};
