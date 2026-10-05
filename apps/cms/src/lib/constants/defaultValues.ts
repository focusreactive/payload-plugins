type LocalizedString = { en: string };
type LocalizedRecord = { en: Record<string, string> };
type LocalizedNode = LocalizedString | LocalizedRecord | { [key: string]: LocalizedNode };
type LocalizedDefaults = { [key: string]: LocalizedNode };

export const DEFAULT_VALUES = {
  blocks: {
    content: {
      heading: { en: "Heading" },
    },
    faq: {
      answer: {
        en: {
          heading: "Answer",
          paragraph: "Add your answer here",
        },
      },
      heading: { en: "FAQ" },
      question: {
        en: "Question",
      },
    },
    hero: {
      title: {
        en: "The operating system for teams that ship.",
      },
    },
  },
  collections: {
    categories: {
      title: { en: "Title" },
    },
    page: {
      title: { en: "Page" },
    },
    posts: {
      excerpt: {
        en: "Short description of the post",
      },
      title: { en: "Title" },
    },
    siteSettings: {
      blog: {
        blogDescription: {
          en: "Blog page description",
        },
        blogTitle: { en: "Blog" },
        readMoreLabel: { en: "Read More" },
        relatedPostsLabel: {
          en: "Related Articles",
        },
      },
      defaultDescription: {
        en: "My Site Description",
      },
      defaultOgDescription: {
        en: "My Site Description",
      },
      notFoundDescription: {
        en: "Unfortunately, the requested page does not exist or has been deleted.",
      },
      notFoundTitle: {
        en: "404 - Page not found",
      },
      seoTitleSuffix: { en: "My Site" },
      siteName: { en: "Site Name" },
    },
  },
  richText: {
    content: {
      en: {
        heading: "Content heading",
        paragraph: "Content section. Replace with your content.",
      },
    },
    text: {
      en: {
        heading: "Heading",
        paragraph: "Text section. Replace with your content.",
      },
    },
  },
} as const satisfies LocalizedDefaults;
