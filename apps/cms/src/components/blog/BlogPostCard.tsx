import { cn } from "@/components/utils";
import type { BlogPostCardProps } from "./types";

export function BlogPostCard({
  title,
  excerpt,
  category,
  readTime,
  image,
  className,
}: BlogPostCardProps) {
  return (
    <article className={cn("group flex flex-col gap-4", className)}>
      <div
        className={cn(
          "relative aspect-[3/2] w-full overflow-hidden rounded-xl border border-border bg-surface-muted",
          "transition-[scale,box-shadow] duration-420 ease-out",
          "group-hover:scale-[1.025] group-hover:shadow-[0_28px_52px_-26px_rgba(10,19,20,0.5)]",
          "motion-reduce:transition-none motion-reduce:group-hover:scale-100"
        )}
      >
        {image}
      </div>

      {(category || readTime) && (
        <div className="text-muted-foreground flex flex-wrap items-center gap-3 text-small">
          {category && <span className="text-foreground whitespace-nowrap">{category}</span>}
          {readTime && <span className="whitespace-nowrap">{readTime}</span>}
        </div>
      )}

      <h3 className="text-h-card text-foreground transition-opacity duration-150 group-hover:opacity-70 motion-reduce:transition-none">
        {title}
      </h3>

      {excerpt && <p className="text-muted-foreground text-body">{excerpt}</p>}
    </article>
  );
}
