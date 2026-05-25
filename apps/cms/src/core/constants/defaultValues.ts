export const DEFAULT_VALUES = {
  blocks: {
    content: {
      heading: { en: "Heading", es: "Encabezado" },
    },
    faq: {
      answer: {
        en: {
          heading: "Answer",
          paragraph: "Add your answer here",
        },
        es: {
          heading: "Respuesta",
          paragraph: "Añade tu respuesta aquí",
        },
      },
      heading: { en: "FAQ", es: "FAQ" },
      question: {
        en: "Question",
        es: "Pregunta",
      },
    },
    hero: {
      title: { en: "Hero", es: "Hero" },
    },
    testimonialsList: {
      heading: { en: "Our testimonials", es: "Nuestros testimonios" },
      subheading: {
        en: "What our clients say",
        es: "Lo que dicen nuestros clientes",
      },
      title: { en: "Testimonials", es: "Testimonials" },
    },
  },
  collections: {
    categories: {
      title: { en: "Title", es: "Título" },
    },
    page: {
      title: { en: "Page", es: "Página" },
    },
    posts: {
      excerpt: {
        en: "Short description of the post",
        es: "Breve descripción de la publicación",
      },
      title: { en: "Title", es: "Título" },
    },
    siteSettings: {
      blog: {
        blogDescription: {
          en: "Blog page description",
          es: "Descripción de la página de blog",
        },
        blogTitle: { en: "Blog", es: "Blog" },
        readMoreLabel: { en: "Read More", es: "Leer más" },
        relatedPostsLabel: {
          en: "Related Articles",
          es: "Artículos relacionados",
        },
      },
      defaultDescription: {
        en: "My Site Description",
        es: "Descripción de mi sitio",
      },
      defaultOgDescription: {
        en: "My Site Description",
        es: "Descripción de mi sitio",
      },
      notFoundDescription: {
        en: "Unfortunately, the requested page does not exist or has been deleted.",
        es: "Lo sentimos, la página solicitada no existe o ha sido eliminada.",
      },
      notFoundTitle: {
        en: "404 - Page not found",
        es: "Página no encontrada",
      },
      seoTitleSuffix: { en: "My Site", es: "Mi sitio web" },
      siteName: { en: "Site Name", es: "Nombre del sitio" },
    },
  },
  richText: {
    content: {
      en: {
        heading: "Content heading",
        paragraph: "Content section. Replace with your content.",
      },
      es: {
        heading: "Encabezado de contenido",
        paragraph: "Sección de contenido. Sustituye por tu contenido.",
      },
    },
    text: {
      en: {
        heading: "Heading",
        paragraph: "Text section. Replace with your content.",
      },
      es: {
        heading: "Encabezado",
        paragraph: "Sección de texto. Sustituye por tu contenido.",
      },
    },
  },
} as const;
