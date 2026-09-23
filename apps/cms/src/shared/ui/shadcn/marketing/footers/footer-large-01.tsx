import { Badge } from "@/shared/ui/shadcn/base/badges/badges";
import { Button } from "@/shared/ui/shadcn/base/buttons/button";
import { UntitledLogo } from "@/shared/ui/shadcn/foundations/logo/untitledui-logo";

const footerNavList = [
  {
    label: "Product",
    items: [
      {
        label: "Overview",
        href: "#",
      },
      {
        label: "Features",
        href: "#",
      },
      {
        label: "Solutions",
        href: "#",
        badge: (
          <Badge color="gray" type="modern" size="sm" className="ml-1">
            New
          </Badge>
        ),
      },
      {
        label: "Tutorials",
        href: "#",
      },
      {
        label: "Pricing",
        href: "#",
      },
      {
        label: "Releases",
        href: "#",
      },
    ],
  },
  {
    label: "Company",
    items: [
      {
        label: "About us",
        href: "#",
      },
      {
        label: "Careers",
        href: "#",
      },
      {
        label: "Press",
        href: "#",
      },
      {
        label: "News",
        href: "#",
      },
      {
        label: "Media kit",
        href: "#",
      },
      {
        label: "Contact",
        href: "#",
      },
    ],
  },
  {
    label: "Resources",
    items: [
      {
        label: "Blog",
        href: "#",
      },
      {
        label: "Newsletter",
        href: "#",
      },
      {
        label: "Events",
        href: "#",
      },
      {
        label: "Help centre",
        href: "#",
      },
      {
        label: "Tutorials",
        href: "#",
      },
      {
        label: "Support",
        href: "#",
      },
    ],
  },
  {
    label: "Use cases",
    items: [
      {
        label: "Startups",
        href: "#",
      },
      {
        label: "Enterprise",
        href: "#",
      },
      {
        label: "Government",
        href: "#",
      },
      {
        label: "SaaS centre",
        href: "#",
      },
      {
        label: "Marketplaces",
        href: "#",
      },
      {
        label: "Ecommerce",
        href: "#",
      },
    ],
  },
  {
    label: "Social",
    items: [
      {
        label: "X",
        href: "#",
      },
      {
        label: "LinkedIn",
        href: "#",
      },
      {
        label: "Facebook",
        href: "#",
      },
      {
        label: "GitHub",
        href: "#",
      },
      {
        label: "AngelList",
        href: "#",
      },
      {
        label: "Dribbble",
        href: "#",
      },
    ],
  },
  {
    label: "Legal",
    items: [
      {
        label: "Terms",
        href: "#",
      },
      {
        label: "Privacy",
        href: "#",
      },
      {
        label: "Cookies",
        href: "#",
      },
      {
        label: "Licenses",
        href: "#",
      },
      {
        label: "Settings",
        href: "#",
      },
      {
        label: "Contact",
        href: "#",
      },
    ],
  },
];

export const FooterLarge01 = () => {
  return (
    <footer className="bg-primary py-12 md:pt-16">
      <div className="mx-auto max-w-container px-4 md:px-8">
        <nav>
          <ul className="grid grid-cols-2 gap-8 md:grid-cols-3 lg:grid-cols-6">
            {footerNavList.map((category) => (
              <li key={category.label}>
                <h4 className="text-sm font-semibold text-quaternary">{category.label}</h4>
                <ul className="mt-4 flex flex-col gap-3">
                  {category.items.map((item) => (
                    <li key={item.label} className="flex">
                      <Button
                        color="link-gray"
                        size="md"
                        href={item.href}
                        iconTrailing={item.badge}
                        className="max-h-5 gap-1"
                      >
                        {item.label}
                      </Button>
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        </nav>
        <div className="mt-12 flex flex-col justify-between gap-6 border-t border-secondary pt-8 md:mt-16 md:flex-row md:items-center">
          <UntitledLogo className="h-7 w-min" />
          <p className="text-sm text-quaternary">© 2077 Untitled UI. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
};
