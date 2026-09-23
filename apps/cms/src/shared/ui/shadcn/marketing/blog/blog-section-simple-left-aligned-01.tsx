import { Button } from "@/shared/ui/shadcn/base/buttons/button";
import { Simple01Vertical } from '@/shared/ui/shadcn/marketing/blog/base-components/blog-cards';
import type { Article } from '@/shared/ui/shadcn/marketing/blog/base-components/blog-cards';

const articles: Article[] = [
  {
    id: "article-1",
    title: "UX review presentations",
    summary:
      "How do you create compelling presentations that wow your colleagues and impress your managers?",
    href: "#",
    category: {
      name: "Design",
      href: "#",
    },
    thumbnailUrl: "https://www.untitledui.com/marketing/spirals.webp",
    publishedAt: "20 Jan 2027",
    readingTime: "8 min read",
    author: {
      name: "Olivia Rhye",
      href: "#",
      avatarUrl: "https://www.untitledui.com/images/avatars/olivia-rhye?fm=webp&q=80",
    },
    tags: [
      {
        name: "Design",
        color: "brand",
        href: "#",
      },
      {
        name: "Research",
        color: "indigo",
        href: "#",
      },
      {
        name: "Presentation",
        color: "pink",
        href: "#",
      },
    ],
    isFeatured: true,
  },
  {
    id: "article-2",
    title: "Migrating to Linear 101",
    summary:
      "Linear helps streamline software projects, sprints, tasks, and bug tracking. Here's how to get started.",
    href: "#",
    category: {
      name: "Product",
      href: "#",
    },
    thumbnailUrl: "https://www.untitledui.com/marketing/conversation.webp",
    publishedAt: "19 Jan 2027",
    readingTime: "8 min read",
    author: {
      name: "Phoenix Baker",
      href: "#",
      avatarUrl: "https://www.untitledui.com/images/avatars/phoenix-baker?fm=webp&q=80",
    },
    tags: [
      {
        name: "Product",
        color: "sky",
        href: "#",
      },
      {
        name: "Tools",
        color: "pink",
        href: "#",
      },
      {
        name: "SaaS",
        color: "pink",
        href: "#",
      },
    ],
  },
  {
    id: "article-3",
    title: "Building your API stack",
    summary:
      "The rise of RESTful APIs has been met by a rise in tools for creating, testing, and managing them.",
    href: "#",
    category: {
      name: "Software Engineering",
      href: "#",
    },
    thumbnailUrl: "https://www.untitledui.com/blog/two-mobile-shapes-pattern.webp",
    publishedAt: "18 Jan 2027",
    readingTime: "8 min read",
    author: {
      name: "Lana Steiner",
      href: "#",
      avatarUrl: "https://www.untitledui.com/images/avatars/lana-steiner?fm=webp&q=80",
    },
    tags: [
      {
        name: "Software Development",
        color: "success",
        href: "#",
      },
      {
        name: "Tools",
        color: "pink",
        href: "#",
      },
    ],
  },
  {
    id: "article-3.5",
    title: "PM mental models",
    summary: "Mental models are simple expressions of complex processes or relationships.",
    href: "#",
    category: {
      name: "Product",
      href: "#",
    },
    thumbnailUrl: "https://www.untitledui.com/blog/two-people.webp",
    publishedAt: "17 Jan 2027",
    readingTime: "8 min read",
    author: {
      name: "Demi Wilkinson",
      href: "#",
      avatarUrl: "https://www.untitledui.com/images/avatars/demi-wilkinson?fm=webp&q=80",
    },
    tags: [
      {
        name: "Leadership",
        color: "brand",
        href: "#",
      },
      {
        name: "Management",
        color: "slate",
        href: "#",
      },
    ],
  },
  {
    id: "article-4",
    title: "PM mental models",
    summary: "Mental models are simple expressions of complex processes or relationships.",
    href: "#",
    category: {
      name: "Product",
      href: "#",
    },
    thumbnailUrl: "https://www.untitledui.com/marketing/brainstorming.webp",
    publishedAt: "16 Jan 2027",
    readingTime: "8 min read",
    author: {
      name: "Demi Wilkinson",
      href: "#",
      avatarUrl: "https://www.untitledui.com/images/avatars/demi-wilkinson?fm=webp&q=80",
    },
    tags: [
      {
        name: "Product",
        color: "sky",
        href: "#",
      },
      {
        name: "Research",
        color: "indigo",
        href: "#",
      },
      {
        name: "Frameworks",
        color: "orange",
        href: "#",
      },
    ],
  },
  {
    id: "article-5",
    title: "What is Wireframing?",
    summary: "Introduction to Wireframing and its Principles. Learn from the best in the industry.",
    href: "#",
    category: {
      name: "Design",
      href: "#",
    },
    thumbnailUrl: "https://www.untitledui.com/marketing/workspace-4.webp",
    publishedAt: "15 Jan 2027",
    readingTime: "8 min read",
    author: {
      name: "Candice Wu",
      href: "#",
      avatarUrl: "https://www.untitledui.com/images/avatars/candice-wu?fm=webp&q=80",
    },
    tags: [
      {
        name: "Design",
        color: "brand",
        href: "#",
      },
      {
        name: "Research",
        color: "indigo",
        href: "#",
      },
    ],
  },
  {
    id: "article-6",
    title: "How collaboration makes us better designers",
    summary: "Collaboration can make our teams stronger, and our individual designs better.",
    href: "#",
    category: {
      name: "Design",
      href: "#",
    },
    thumbnailUrl: "https://www.untitledui.com/marketing/collaboration.webp",
    publishedAt: "14 Jan 2027",
    readingTime: "8 min read",
    author: {
      name: "Natali Craig",
      href: "#",
      avatarUrl: "https://www.untitledui.com/images/avatars/natali-craig?fm=webp&q=80",
    },
    tags: [
      {
        name: "Design",
        color: "brand",
        href: "#",
      },
      {
        name: "Research",
        color: "indigo",
        href: "#",
      },
    ],
  },
  {
    id: "article-7",
    title: "Our top 10 Javascript frameworks to use",
    summary:
      "JavaScript frameworks make development easy with extensive features and functionalities.",
    href: "#",
    category: {
      name: "Product",
      href: "#",
    },
    thumbnailUrl: "https://www.untitledui.com/marketing/man-and-laptop-2.webp",
    publishedAt: "13 Jan 2027",
    readingTime: "8 min read",
    author: {
      name: "Drew Cano",
      href: "#",
      avatarUrl: "https://www.untitledui.com/images/avatars/drew-cano?fm=webp&q=80",
    },
    tags: [
      {
        name: "Software development",
        color: "success",
        href: "#",
      },
      {
        name: "Tools",
        color: "pink",
        href: "#",
      },
      {
        name: "SaaS",
        color: "pink",
        href: "#",
      },
    ],
  },
  {
    id: "article-8",
    title: "Podcast: Creating a better CX Community",
    summary: "Starting a community doesn't need to be complicated, but how do you get started?",
    href: "#",
    category: {
      name: "Customer Success",
      href: "#",
    },
    thumbnailUrl: "https://www.untitledui.com/marketing/podcast-girl-2.webp",
    publishedAt: "12 Jan 2027",
    readingTime: "8 min read",
    author: {
      name: "Orlando Diggs",
      href: "#",
      avatarUrl: "https://www.untitledui.com/images/avatars/orlando-diggs?fm=webp&q=80",
    },
    tags: [
      {
        name: "Podcasts",
        color: "brand",
        href: "#",
      },
      {
        name: "Customer success",
        color: "slate",
        href: "#",
      },
    ],
  },
];

export const BlogSectionSimpleLeftAligned01 = () => {
  return (
    <section className="bg-primary py-16 md:py-24">
      <div className="mx-auto max-w-container px-4 md:px-8">
        <div className="flex flex-col items-start justify-between lg:flex-row">
          <div className="max-w-3xl">
            <p className="text-sm font-semibold text-brand-secondary md:text-md">Our blog</p>
            <h2 className="mt-3 text-display-sm font-semibold text-primary md:text-display-md">
              Latest blog posts
            </h2>
            <p className="mt-4 text-lg text-tertiary md:mt-5 md:text-xl">
              Tool and strategies modern teams need to help their companies grow.
            </p>
          </div>

          <div className="hidden gap-3 lg:flex">
            <Button size="xl">View all posts</Button>
          </div>
        </div>

        <ul className="mt-12 grid grid-cols-1 gap-x-8 gap-y-12 md:mt-16 md:grid-cols-2 md:gap-y-16 lg:grid-cols-3">
          {articles.slice(0, 3).map((article) => (
            <li key={article.id}>
              <Simple01Vertical article={article} />
            </li>
          ))}
        </ul>
        <div className="mt-12 flex flex-col gap-3 lg:hidden">
          <Button size="xl">View all posts</Button>
        </div>
      </div>
    </section>
  );
};
