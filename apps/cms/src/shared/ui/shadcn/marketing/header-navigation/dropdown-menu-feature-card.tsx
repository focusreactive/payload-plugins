"use client";

import { BookClosed, FileCode01, PlayCircle, Stars02 } from "@untitledui/icons";
import { Button } from "@/shared/ui/shadcn/base/buttons/button";
import { NavMenuItemLink } from "./base-components/nav-menu-item";
import { FeatureCardVertical } from "./base-components/nav-menu-item-card";

const items = [
  {
    title: "Blog",
    subtitle: "The latest industry new and guides curated by our expert team.",
    href: "/",
    Icon: BookClosed,
  },
  {
    title: "Customer stories",
    subtitle: "Learn how our customers are using Untitled UI to 10x their growth.",
    href: "/",
    Icon: Stars02,
  },
  {
    title: "Video tutorials",
    subtitle: "Get up and running on our newest features and in-depth guides.",
    href: "/",
    Icon: PlayCircle,
  },
  {
    title: "Documentation",
    subtitle: "In-depth articles on our tools and technologies to empower teams.",
    href: "/",
    Icon: FileCode01,
  },
];

export const DropdownMenuFeatureCard = () => {
  return (
    <div className="px-3 pb-2 md:max-w-160 md:p-0">
      <nav className="flex flex-col overflow-hidden rounded-xl bg-primary shadow-xs ring-1 ring-secondary_alt md:w-max md:flex-row md:rounded-2xl md:shadow-lg">
        <ul className="flex flex-1 flex-col gap-0.5 pt-2 pb-3 md:p-2">
          {items.map(({ title, subtitle, href, Icon }) => (
            <li key={title + href}>
              <NavMenuItemLink icon={Icon} title={title} subtitle={subtitle} href={href} />
            </li>
          ))}
        </ul>
        <div className="bg-secondary px-1 pt-2 pb-3 md:max-w-76 md:px-2">
          <FeatureCardVertical
            href="#"
            imgSrc="https://www.untitledui.com/marketing/smiling-girl.webp"
            title="We've just released an update!"
            description="Check out the all new dashboard view. Pages now load up to 3x faster."
            actionsContent={
              <div className="inline-flex gap-3">
                <Button color="link-gray" size="sm">
                  Dismiss
                </Button>
                <Button color="link-color" size="sm">
                  Changelog
                </Button>
              </div>
            }
          />
        </div>
      </nav>
    </div>
  );
};
