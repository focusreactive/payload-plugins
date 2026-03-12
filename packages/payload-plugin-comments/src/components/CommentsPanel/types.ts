import type { Comment } from "../../types";

export type FieldPath = string | null;

export type Group = [FieldPath, Comment[]];
