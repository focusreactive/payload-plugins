export interface WbCommentAnalysisFeatured {
  image: string;
  category: string;
  date: string;
  title: string;
  excerpt: string;
  cta: string;
  href: string;
}

export interface WbCommentAnalysisItem {
  category: string;
  date: string;
  title: string;
  description: string;
  href: string;
}

export interface WbCommentAnalysisProps {
  eyebrow: string;
  title: string;
  cta: string;
  ctaHref?: string;
  featured: WbCommentAnalysisFeatured;
  items: WbCommentAnalysisItem[];
}
