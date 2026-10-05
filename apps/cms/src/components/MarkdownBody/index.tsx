import { isValidElement } from "react";
import type { ReactNode } from "react";
import ReactMarkdown from "react-markdown";
import type { Components } from "react-markdown";
import remarkGfm from "remark-gfm";

import { proseVariants } from "@/components/richText/proseVariants";
import { Link } from "@/components/shared";

import { CodeBlock } from "./CodeBlock";

/** A fenced block arrives as <pre><code class="language-x">…</code></pre>. */
function fencedCode(children: ReactNode): { code: string; language?: string } | null {
  if (!isValidElement<{ className?: string; children?: ReactNode }>(children)) {
    return null;
  }
  const language = /language-([\w+-]+)/u.exec(children.props.className ?? "")?.[1];
  return { code: String(children.props.children ?? ""), language };
}

const components: Components = {
  pre: ({ children }) => {
    const fenced = fencedCode(children);
    return fenced ? <CodeBlock {...fenced} /> : <pre>{children}</pre>;
  },
  a: ({ href, children }) =>
    href && href.startsWith("/") ? (
      <Link href={href}>{children}</Link>
    ) : (
      <a href={href} rel="noopener noreferrer">
        {children}
      </a>
    ),
  img: ({ src, alt, title }) => (
    <figure>
      {/* eslint-disable-next-line @next/next/no-img-element -- migrated article images, any size */}
      <img src={typeof src === "string" ? src : undefined} alt={alt ?? ""} loading="lazy" />
      {title ? <figcaption>{title}</figcaption> : null}
    </figure>
  ),
  // A figure cannot live inside <p>; image-only paragraphs render their children directly.
  p: ({ node, children }) =>
    node?.children.length === 1 &&
    node.children[0]?.type === "element" &&
    node.children[0].tagName === "img" ? (
      <>{children}</>
    ) : (
      <p>{children}</p>
    ),
  table: ({ children }) => (
    <div className="overflow-x-auto">
      <table>{children}</table>
    </div>
  ),
};

/**
 * Imported articles keep their Markdown (§5.2). Rendered on the server with GFM (tables, autolinks)
 * into the same prose styles as rich-text posts, so both formats look identical. Raw HTML in the
 * Markdown is not rendered (react-markdown's default), so no sanitiser is needed.
 */
export function MarkdownBody({ markdown }: { markdown: string }) {
  return (
    <div className={proseVariants({ variant: "copy" })}>
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {markdown}
      </ReactMarkdown>
    </div>
  );
}
