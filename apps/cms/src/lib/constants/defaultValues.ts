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
        en: "Open Source System Software Experts",
      },
    },
  },
  collections: {
    tags: {
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
          en: "Engineering notes, research and news from the Codethink team.",
        },
        blogTitle: { en: "Blog" },
        readMoreLabel: { en: "Read more" },
        relatedPostsLabel: {
          en: "More from Codethink",
        },
      },
      defaultDescription: {
        en: "Open source system software experts: build engineering, Linux, safety-critical and trustable software.",
      },
      defaultOgDescription: {
        en: "Open source system software experts: build engineering, Linux, safety-critical and trustable software.",
      },
      notFoundDescription: {
        en: "Unfortunately, the requested page does not exist or has been deleted.",
      },
      notFoundTitle: {
        en: "404 - Page not found",
      },
      seoTitleSuffix: { en: "Codethink" },
      siteName: { en: "Codethink" },
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
