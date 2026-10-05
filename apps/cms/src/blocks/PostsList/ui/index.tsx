import { Link } from "@/components/shared";
import { Media } from "@/components/media";
import { cn } from "@/components/utils";

import { PostAuthor, PostMeta } from "./PostMeta";
import type { PostsListItem, PostsListProps } from "./types";

function Cover({ item, className }: { item: PostsListItem; className?: string }) {
  if (!item.image) {
    return <div aria-hidden className={cn("bg-ct-dark-blue", className)} />;
  }
  return (
    <Media
      {...item.image.data}
      visualEditing={item.image.visualEditing}
      className={className}
      imageProps={{ ...item.image.imageProps, className: "size-full object-cover" }}
    />
  );
}

function TagPill({ tag }: { tag?: string | null }) {
  if (!tag) {
    return null;
  }
  return (
    <span className="w-fit rounded-pill bg-primary-soft px-2.5 py-1 text-xs font-medium text-primary-soft-foreground">
      {tag}
    </span>
  );
}

/** Grid card (§6.7): 16:9 cover, tag pill, title, date · reading time, author line. */
function GridCard({ item }: { item: PostsListItem }) {
  return (
    <article className="group relative flex h-full flex-col overflow-hidden rounded-lg border border-border bg-card transition-[border-color,box-shadow] duration-200 hover:border-primary hover:shadow-[inset_0_3px_0_var(--color-highlight)]">
      <div className="aspect-video overflow-hidden">
        <Cover item={item} className="size-full" />
      </div>
      <div className="flex flex-1 flex-col gap-3 p-6">
        <TagPill tag={item.tag} />
        <h3 className="text-h-card text-heading">
          <Link
            href={item.href}
            className="underline-offset-[3px] after:absolute after:inset-0 after:content-[''] group-hover:underline"
          >
            {item.title}
          </Link>
        </h3>
        <PostMeta item={item} />
        <div className="mt-auto pt-2">
          <PostAuthor author={item.author} />
        </div>
      </div>
    </article>
  );
}

/** Dense row: mono date column + title + excerpt. */
function ListRow({ item }: { item: PostsListItem }) {
  return (
    <li className="group relative grid gap-2 border-t border-border py-6 md:grid-cols-[10rem_minmax(0,1fr)] md:gap-8">
      <p className="font-mono text-[0.8125rem] uppercase tracking-[0.08em] text-muted-foreground">
        {item.date ? <time dateTime={item.isoDate ?? undefined}>{item.date}</time> : null}
      </p>
      <div className="flex flex-col gap-2">
        <h3 className="text-[1.25rem] font-semibold leading-snug text-heading">
          <Link
            href={item.href}
            className="underline-offset-[3px] after:absolute after:inset-0 after:content-[''] group-hover:text-primary group-hover:underline"
          >
            {item.title}
          </Link>
        </h3>
        {item.excerpt && (
          <p className="line-clamp-2 max-w-[70ch] text-muted-foreground">{item.excerpt}</p>
        )}
      </div>
    </li>
  );
}

/** Featured: a large dark card (2:1 cover with a dark-blue tint, white title). */
function FeaturedCard({ item }: { item: PostsListItem }) {
  return (
    <article className="group relative flex min-h-[360px] flex-col justify-end overflow-hidden rounded-lg bg-ct-dark-blue p-7 text-ct-white lg:row-span-2">
      <Cover item={item} className="absolute inset-0 size-full opacity-40" />
      <div className="relative flex flex-col gap-3">
        {item.tag && <span className="text-eyebrow text-ct-electric-green">{item.tag}</span>}
        <h3 className="text-[clamp(1.5rem,2.4vw,2rem)] font-bold leading-tight text-ct-white">
          <Link
            href={item.href}
            className="underline-offset-[3px] decoration-ct-electric-green after:absolute after:inset-0 after:content-[''] group-hover:underline"
          >
            {item.title}
          </Link>
        </h3>
        {item.excerpt && (
          <p className="line-clamp-3 max-w-[60ch] text-ct-grey-300">{item.excerpt}</p>
        )}
        <PostMeta item={item} className="text-ct-grey-300" />
      </div>
    </article>
  );
}

function groupByYear(items: PostsListItem[], enabled: boolean) {
  if (!enabled) {
    return [{ items, year: null }];
  }
  const groups: { year: string | null; items: PostsListItem[] }[] = [];
  for (const item of items) {
    const year = item.year ?? null;
    const last = groups.at(-1);
    if (last && last.year === year) {
      last.items.push(item);
    } else {
      groups.push({ items: [item], year });
    }
  }
  return groups;
}

export function PostsList({ items, layout, yearSeparators, viewAll, emptyText }: PostsListProps) {
  if (items.length === 0) {
    return (
      <p className="flex items-center gap-3 rounded-md bg-ct-sand p-6 text-muted-foreground">
        <span aria-hidden className="size-5 rounded-pill border-2 border-ct-green-500" />
        {emptyText ?? "No posts yet."}
      </p>
    );
  }

  return (
    <div className="not-prose flex flex-col gap-8">
      {layout === "list" &&
        groupByYear(items, Boolean(yearSeparators)).map((group) => (
          <div key={group.year ?? "all"}>
            {group.year && <h3 className="pb-3 text-eyebrow text-primary">{group.year}</h3>}
            <ul className="border-b border-border">
              {group.items.map((item) => (
                <ListRow key={item.href} item={item} />
              ))}
            </ul>
          </div>
        ))}

      {layout === "grid" && (
        <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:gap-8">
          {items.map((item) => (
            <li key={item.href}>
              <GridCard item={item} />
            </li>
          ))}
        </ul>
      )}

      {layout === "featured" && (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] xl:gap-8">
          {items[0] && <FeaturedCard item={items[0]} />}
          {items.slice(1, 3).map((item) => (
            <GridCard key={item.href} item={item} />
          ))}
        </div>
      )}

      {viewAll && (
        <Link
          href={viewAll.href}
          className="w-fit font-semibold text-primary underline-offset-[3px] hover:text-link-hover hover:underline"
        >
          {viewAll.label} <span aria-hidden>→</span>
        </Link>
      )}
    </div>
  );
}
