/** The fixed wording of the blog templates, per language, as the site prints it. */
interface BlogLabels {
  readTime: (minutes: number) => string;
  reviewedBy: string;
  writtenBy: string;
  published: string;
  updated: string;
  contents: string;
  tags: string;
  meetDoctor: (name: string) => string;
  dateLocale: string;
}

const LABELS: Record<string, BlogLabels> = {
  en: {
    contents: "In This Article",
    dateLocale: "en-US",
    meetDoctor: (name) => `Meet ${name}`,
    published: "Published",
    readTime: (minutes) => `${minutes} Min Read`,
    reviewedBy: "Medically reviewed by",
    tags: "Tags",
    updated: "Updated",
    writtenBy: "Written by",
  },
  es: {
    contents: "Índice",
    dateLocale: "es-US",
    meetDoctor: (name) => `Conozca al ${name}`,
    published: "Fecha de Publicación:",
    readTime: (minutes) => `Lectura de ${minutes} minutos`,
    reviewedBy: "Revisado médicamente por",
    tags: "Etiquetas",
    updated: "Última actualización:",
    writtenBy: "Escrito por",
  },
};

export const blogLabels = (locale: string): BlogLabels => LABELS[locale] ?? LABELS.en;

/** A date as the site prints it: August 10, 2026 or 10 de agosto de 2026. */
export function formatBlogDate(value: string, locale: string): string {
  return new Intl.DateTimeFormat(blogLabels(locale).dateLocale, {
    day: "numeric",
    month: "long",
    timeZone: "UTC",
    year: "numeric",
  }).format(new Date(value));
}
