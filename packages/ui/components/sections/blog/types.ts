import type { ReactNode } from "react";

import type { IRichTextProps } from "../../ui/richText/types";

export enum BlogStyle {
  ThreeColumn = "three-column",
  ThreeColumnWithImages = "three-column-with-images",
  ThreeColumnWithBackgroundImages = "three-column-with-background-images",
}

export interface BlogPostCardProps {
  title: string;
  excerpt?: string | null;
  category?: string | null;
  readTime?: string | null;
  image?: ReactNode;
  className?: string;
}

export interface IBlogSectionProps {
  text: IRichTextProps;
  posts: BlogPostCardProps[];
  style: BlogStyle;
}
