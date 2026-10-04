import type { PreparedMedia } from "@/components/media";

export interface PostsListItem {
  href: string;
  title: string;
  excerpt?: string | null;
  image?: PreparedMedia | null;
  tag?: string | null;
  date?: string | null;
  isoDate?: string | null;
  year?: string | null;
  readingTime?: number | null;
  author?: { name: string; avatarUrl?: string | null } | null;
}

export type PostsListLayout = "grid" | "list" | "featured";

export interface PostsListProps {
  items: PostsListItem[];
  layout: PostsListLayout;
  /** Group list rows under year headings (news listing). */
  yearSeparators?: boolean;
  viewAll?: { href: string; label: string } | null;
  emptyText?: string;
}
