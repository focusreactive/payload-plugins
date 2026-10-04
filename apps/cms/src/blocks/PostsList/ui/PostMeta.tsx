import { cn } from "@/components/utils";

import type { PostsListItem } from "./types";

export function PostMeta({ item, className }: { item: PostsListItem; className?: string }) {
  const parts = [
    item.date ? (
      <time key="d" dateTime={item.isoDate ?? undefined}>
        {item.date}
      </time>
    ) : null,
    item.readingTime ? <span key="r">{item.readingTime} min read</span> : null,
  ].filter(Boolean);

  if (parts.length === 0) {
    return null;
  }

  return (
    <p
      className={cn(
        "flex flex-wrap items-center gap-x-2 text-small text-muted-foreground",
        className
      )}
    >
      {parts.map((part, index) => (
        <span key={index} className="inline-flex items-center gap-2">
          {index > 0 && <span aria-hidden>·</span>}
          {part}
        </span>
      ))}
    </p>
  );
}

export function PostAuthor({ author }: { author: PostsListItem["author"] }) {
  if (!author) {
    return null;
  }
  const initials = author.name
    .split(/\s+/u)
    .map((part) => part[0])
    .slice(0, 2)
    .join("");

  return (
    <p className="flex items-center gap-2 text-small text-foreground">
      {author.avatarUrl ? (
        // eslint-disable-next-line @next/next/no-img-element -- 24px avatar from the CMS
        <img src={author.avatarUrl} alt="" className="size-6 rounded-pill object-cover" />
      ) : (
        <span
          aria-hidden
          className="grid size-6 place-items-center rounded-pill bg-primary-soft text-[10px] font-semibold text-primary-soft-foreground"
        >
          {initials}
        </span>
      )}
      {author.name}
    </p>
  );
}
