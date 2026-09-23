"use client";

import { BookClosed, FileCode01, LifeBuoy01, PlayCircle, Stars02 } from "@untitledui/icons";
import { Button } from "@/shared/ui/shadcn/base/buttons/button";
import { NavMenuItemLink } from "./base-components/nav-menu-item";

const items = [
  {
    title: "Blog",
    subtitle: "The latest industry new and guides curated by our expert team.",
    href: "/blog",
    Icon: BookClosed,
  },
  {
    title: "Customer stories",
    subtitle: "Learn how our customers are using Untitled UI to 10x their growth.",
    href: "/customer-stories",
    Icon: Stars02,
  },
  {
    title: "Video tutorials",
    subtitle: "Get up and running on our newest features and in-depth guides.",
    href: "/tutorials",
    Icon: PlayCircle,
  },
  {
    title: "Documentation",
    subtitle: "In-depth articles on our tools and technologies to empower teams.",
    href: "/docs",
    Icon: FileCode01,
  },
  {
    title: "Help and support",
    subtitle: "Need help with something? Our expert team is here to help 24/7.",
    href: "/help",
    Icon: LifeBuoy01,
  },
];

export const DropdownMenuSimpleWithFooter = () => {
  return (
    <div className="px-3 pb-2 md:max-w-84 md:p-0">
      <nav className="overflow-hidden rounded-xl bg-secondary shadow-xs ring-1 ring-secondary_alt md:rounded-2xl md:shadow-lg">
        <ul className="flex flex-col gap-0.5 rounded-xl bg-primary py-2 ring-1 ring-secondary md:rounded-t-2xl md:p-2">
          {items.map(({ title, subtitle, href, Icon }) => (
            <li key={title}>
              <NavMenuItemLink icon={Icon} title={title} subtitle={subtitle} href={href} />
            </li>
          ))}
        </ul>
        <div className="flex justify-center px-4 py-5 text-center sm:px-5">
          <Button href="#" color="link-color" size="md">
            All resources
          </Button>
        </div>
      </nav>
    </div>
  );
};
