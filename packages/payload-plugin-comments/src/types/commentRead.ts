import type { User } from "./user";

export interface CommentRead {
  id: number;
  comment: number | { id: number };
  user: number | User;
  readAt: string;
  tenant?: number | string | null;
  createdAt: string;
  updatedAt: string;
}
