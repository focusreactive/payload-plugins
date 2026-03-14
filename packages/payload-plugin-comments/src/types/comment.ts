import type { User } from "./user";

export interface CommentMention {
  id: string | number | null;
  user: number | User;
}

export interface Comment {
  id: number;
  documentId?: number | null;
  collectionSlug?: string | null;
  globalSlug?: string | null;
  fieldPath?: string | null;
  locale?: string | null;
  text: string;
  mentions?: CommentMention[] | null;
  author: number | User;
  isResolved: boolean;
  resolvedBy?: number | User | null;
  resolvedAt?: string | null;
  tenant?: number | string | null;
  createdAt: string;
  updatedAt: string;
}
