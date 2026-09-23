import { Avatar } from "@/shared/ui/shadcn/base/avatar/avatar";
import { Button } from "@/shared/ui/shadcn/base/buttons/button";
import { Dribbble, LinkedIn, X } from "@/shared/ui/shadcn/foundations/social-icons";

const teamMembers = [
  {
    name: "Amélie Laurent",
    title: "Founder & CEO",
    summary: "Former co-founder of Opendoor. Early staff at Spotify and Clearbit.",
    avatarUrl: "https://www.untitledui.com/images/avatars/amelie-laurent?fm=webp&q=80",
    socials: [
      {
        icon: X,
        href: "https://x.com/",
      },
      {
        icon: LinkedIn,
        href: "https://www.linkedin.com/",
      },
      {
        icon: Dribbble,
        href: "https://dribbble.com/",
      },
    ],
  },
  {
    name: "Nikolas Gibbons",
    title: "Engineering Manager",
    summary: "Lead engineering teams at Figma, Pitch, and Protocol Labs.",
    avatarUrl: "https://www.untitledui.com/images/avatars/nikolas-gibbons?fm=webp&q=80",
    socials: [
      {
        icon: X,
        href: "https://x.com/",
      },
      {
        icon: LinkedIn,
        href: "https://www.linkedin.com/",
      },
      {
        icon: Dribbble,
        href: "https://dribbble.com/",
      },
    ],
  },
  {
    name: "Sienna Hewitt",
    title: "Product Manager",
    summary: "Former PM for Linear, Lambda School, and On Deck.",
    avatarUrl: "https://www.untitledui.com/images/avatars/sienna-hewitt?fm=webp&q=80",
    socials: [
      {
        icon: X,
        href: "https://x.com/",
      },
      {
        icon: LinkedIn,
        href: "https://www.linkedin.com/",
      },
      {
        icon: Dribbble,
        href: "https://dribbble.com/",
      },
    ],
  },
  {
    name: "Lily-Rose Chedjou",
    title: "Frontend Developer",
    summary: "Former frontend dev for Linear, Coinbase, and Postscript.",
    avatarUrl: "https://www.untitledui.com/images/avatars/lily-rose-chedjou?fm=webp&q=80",
    socials: [
      {
        icon: X,
        href: "https://x.com/",
      },
      {
        icon: LinkedIn,
        href: "https://www.linkedin.com/",
      },
      {
        icon: Dribbble,
        href: "https://dribbble.com/",
      },
    ],
  },
  {
    name: "Zahra Christensen",
    title: "Backend Developer",
    summary: "Lead backend dev at Clearbit. Former Clearbit and Loom.",
    avatarUrl: "https://www.untitledui.com/images/avatars/zahra-christensen?fm=webp&q=80",
    socials: [
      {
        icon: X,
        href: "https://x.com/",
      },
      {
        icon: LinkedIn,
        href: "https://www.linkedin.com/",
      },
      {
        icon: Dribbble,
        href: "https://dribbble.com/",
      },
    ],
  },
  {
    name: "Caitlyn King",
    title: "Product Designer",
    summary: "Founding design team at Figma. Former Pleo, Stripe, and Tile.",
    avatarUrl: "https://www.untitledui.com/images/avatars/caitlyn-king?fm=webp&q=80",
    socials: [
      {
        icon: X,
        href: "https://x.com/",
      },
      {
        icon: LinkedIn,
        href: "https://www.linkedin.com/",
      },
      {
        icon: Dribbble,
        href: "https://dribbble.com/",
      },
    ],
  },
  {
    name: "Zaid Schwartz",
    title: "UX Researcher",
    summary: "Lead user research for Slack. Contractor for Netflix and Udacity.",
    avatarUrl: "https://www.untitledui.com/images/avatars/zaid-schwartz?fm=webp&q=80",
    socials: [
      {
        icon: X,
        href: "https://x.com/",
      },
      {
        icon: LinkedIn,
        href: "https://www.linkedin.com/",
      },
      {
        icon: Dribbble,
        href: "https://dribbble.com/",
      },
    ],
  },
  {
    name: "Marco Kelly",
    title: "Customer Success",
    summary: "Lead CX at Wealthsimple. Former PagerDuty and Sqreen.",
    avatarUrl: "https://www.untitledui.com/images/avatars/marco-kelly?fm=webp&q=80",
    socials: [
      {
        icon: X,
        href: "https://x.com/",
      },
      {
        icon: LinkedIn,
        href: "https://www.linkedin.com/",
      },
      {
        icon: Dribbble,
        href: "https://dribbble.com/",
      },
    ],
  },
];

export const TeamSectionSimple04 = () => {
  return (
    <section className="bg-primary py-16 md:py-24">
      <div className="mx-auto max-w-container px-4 md:px-8">
        <div className="mx-auto flex w-full max-w-3xl flex-col items-center text-center">
          <span className="text-sm font-semibold text-brand-secondary md:text-md">
            We're hiring!
          </span>
          <h2 className="mt-3 text-display-sm font-semibold text-primary md:text-display-md">
            Meet our team
          </h2>
          <p className="mt-4 text-lg text-tertiary md:mt-5 md:text-xl">
            Our philosophy is simple—hire a team of diverse, passionate people and foster a culture
            that empowers you to do your best work.
          </p>
          <div className="mt-8 flex flex-col gap-3 self-stretch sm:flex-row-reverse sm:justify-center">
            <Button size="xl">Open positions</Button>
            <Button color="secondary" size="xl">
              About us
            </Button>
          </div>
        </div>

        <div className="mt-12 md:mt-16">
          <ul className="grid w-full grid-cols-1 gap-x-8 gap-y-6 sm:grid-cols-2 md:gap-y-8 lg:grid-cols-3 xl:grid-cols-4">
            {teamMembers.map((item) => (
              <li
                key={item.title}
                className="flex flex-col items-center gap-5 bg-secondary px-6 py-6 md:pr-4"
              >
                <Avatar
                  border
                  src={item.avatarUrl}
                  alt={item.name}
                  size="2xl"
                  className="size-24"
                />
                <div className="text-center">
                  <h3 className="text-lg font-semibold text-primary">{item.name}</h3>
                  <p className="text-md text-brand-secondary">{item.title}</p>
                  <p className="mt-2 text-md text-tertiary">{item.summary}</p>
                  <ul className="mt-4 flex justify-center gap-4">
                    {item.socials.map((social) => (
                      <li key={social.href}>
                        <a
                          href={social.href}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex rounded-xs text-fg-quaternary outline-focus-ring transition duration-100 ease-linear hover:text-fg-quaternary_hover focus-visible:outline-2 focus-visible:outline-offset-2"
                        >
                          <social.icon className="size-5" />
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
};
