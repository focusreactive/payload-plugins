import type { Block } from "payload";

import { siteBlock } from "@/blocks/site/shared";
import type { SiteBlockComponents } from "@/blocks/site/types";
import { BlogHeroComponent } from "@/components/site/blog/BlogHero";
import { BlogListComponent } from "@/components/site/blog/BlogList";
import { TrendingComponent } from "@/components/site/blog/Trending";

export const BlogHeroBlock: Block = siteBlock({
  fields: [
    {
      admin: {
        description: {
          en: "The blog's name, shown as the page's main heading and in every article's breadcrumbs.",
          es: "El nombre del blog, mostrado como encabezado principal y en las migas de pan de cada artículo.",
        },
      },
      label: { en: "Blog name", es: "Nombre del blog" },
      name: "heading",
      required: true,
      type: "text",
    },
    {
      admin: {
        description: {
          en: "One sentence about the blog. Shown under the heading on phones, under the articles list and on every article.",
          es: "Una frase sobre el blog. Se muestra bajo el encabezado en móviles, bajo la lista de artículos y en cada artículo.",
        },
      },
      label: { en: "Description", es: "Descripción" },
      name: "text",
      type: "textarea",
    },
    {
      admin: {
        description: {
          en: "The blog's logo above its name. Also shown under the articles list and on every article.",
          es: "El logotipo del blog sobre su nombre. También se muestra bajo la lista de artículos y en cada artículo.",
        },
      },
      label: { en: "Blog logo", es: "Logotipo del blog" },
      name: "logo",
      relationTo: "media",
      type: "upload",
    },
    {
      admin: { initCollapsed: false },
      fields: [
        {
          admin: {
            description: {
              en: "The article featured beside the heading. Empty features the newest article.",
              es: "El artículo destacado junto al encabezado. Vacío destaca el artículo más reciente.",
            },
          },
          label: { en: "Featured article", es: "Artículo destacado" },
          name: "post",
          relationTo: "posts",
          type: "relationship",
        },
        {
          fields: [
            {
              admin: {
                description: {
                  en: "The badge on the featured article's picture, for example New. Empty hides it.",
                  es: "La etiqueta sobre la imagen del artículo destacado, por ejemplo Nuevo. Vacío la oculta.",
                },
                width: "50%",
              },
              label: { en: "Badge", es: "Etiqueta" },
              name: "badge",
              type: "text",
            },
            {
              admin: {
                description: {
                  en: "The words on the featured article's button, for example Read More.",
                  es: "El texto del botón del artículo destacado, por ejemplo Leer más.",
                },
                width: "50%",
              },
              label: { en: "Button text", es: "Texto del botón" },
              name: "buttonText",
              type: "text",
            },
          ],
          type: "row",
        },
      ],
      label: { en: "Featured article", es: "Artículo destacado" },
      type: "collapsible",
    },
  ],
  interfaceName: "BlogHeroBlock",
  label: "Blog top section",
  slug: "blogHero",
});

export const TrendingBlock: Block = siteBlock({
  fields: [
    {
      admin: {
        description: {
          en: "The heading over the cards, for example Trending Articles.",
          es: "El encabezado sobre las tarjetas, por ejemplo Artículos de tendencia.",
        },
      },
      label: { en: "Heading", es: "Encabezado" },
      name: "heading",
      type: "text",
    },
    {
      admin: {
        description: {
          en: "The articles shown, in this order. Empty shows the three newest articles.",
          es: "Los artículos mostrados, en este orden. Vacío muestra los tres artículos más recientes.",
        },
      },
      hasMany: true,
      label: { en: "Articles", es: "Artículos" },
      maxRows: 3,
      name: "posts",
      relationTo: "posts",
      type: "relationship",
    },
  ],
  interfaceName: "TrendingBlock",
  label: "Trending articles",
  slug: "trending",
});

export const BlogListBlock: Block = siteBlock({
  fields: [
    {
      fields: [
        {
          admin: {
            description: {
              en: "The heading over the tags, for example Popular Tags.",
              es: "El encabezado sobre las etiquetas, por ejemplo Etiquetas populares.",
            },
            width: "50%",
          },
          label: { en: "Tags heading", es: "Encabezado de etiquetas" },
          name: "tagsTitle",
          type: "text",
        },
        {
          admin: {
            description: {
              en: "The first tag, which shows every article, for example All.",
              es: "La primera etiqueta, que muestra todos los artículos, por ejemplo Todos.",
            },
            width: "50%",
          },
          label: { en: "All tag text", es: "Texto de la etiqueta Todos" },
          name: "allText",
          type: "text",
        },
      ],
      type: "row",
    },
    {
      admin: {
        description: {
          en: "The tags a visitor can filter the list by, in this order.",
          es: "Las etiquetas por las que se puede filtrar la lista, en este orden.",
        },
      },
      hasMany: true,
      label: { en: "Tags", es: "Etiquetas" },
      name: "tags",
      relationTo: "categories",
      type: "relationship",
    },
    {
      fields: [
        {
          admin: {
            description: {
              en: "The heading over the list, for example Latest Articles.",
              es: "El encabezado sobre la lista, por ejemplo Últimos artículos.",
            },
            width: "34%",
          },
          label: { en: "List heading", es: "Encabezado de la lista" },
          name: "heading",
          type: "text",
        },
        {
          admin: {
            description: {
              en: "The words on the button that loads more articles, for example Show More.",
              es: "El texto del botón que carga más artículos, por ejemplo Ver más.",
            },
            width: "33%",
          },
          label: { en: "More button text", es: "Texto del botón Ver más" },
          name: "moreText",
          type: "text",
        },
        {
          admin: {
            description: {
              en: "How many articles show before the more button is pressed, and how many each press adds.",
              es: "Cuántos artículos se muestran antes de pulsar el botón Ver más, y cuántos añade cada pulsación.",
            },
            width: "33%",
          },
          defaultValue: 8,
          label: { en: "Articles per step", es: "Artículos por paso" },
          max: 24,
          min: 1,
          name: "pageSize",
          type: "number",
        },
      ],
      type: "row",
    },
  ],
  interfaceName: "BlogListBlock",
  label: "Articles list with tags",
  slug: "blogList",
});

/** The blog's own top section. Registered with the page heroes (see `siteHeroBlocks`). */
export const blogHeroBlocks: Block[] = [BlogHeroBlock];

/** Sections that exist for the blog page template. Registered in `@/blocks/siteBlocks`. */
export const blogBlocks: Block[] = [TrendingBlock, BlogListBlock];

export const blogBlockComponents: SiteBlockComponents = {
  blogHero: BlogHeroComponent,
  blogList: BlogListComponent,
  trending: TrendingComponent,
};
