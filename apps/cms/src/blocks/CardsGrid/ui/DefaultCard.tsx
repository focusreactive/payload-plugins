import { Button } from "@/shared/ui/shadcn/base/buttons/button";
import { DemoCredential } from "@/components/demo/DemoCredential";
import { FeaturedIcon } from "@/shared/ui/shadcn/foundations/featured-icon/featured-icon";
import { Avatar } from "@/shared/ui/shadcn/base/avatar/avatar";
import type { IDefaultCardProps } from "./types";

function initialsOf(name: string) {
  const words = name
    .replace(/\b[A-Z]\.\s*/gu, "")
    .split(/[\s-]+/u)
    .filter(Boolean);
  return (
    (words[0]?.[0] ?? "") + (words.length > 1 ? words[words.length - 1][0] : "")
  ).toUpperCase();
}

export default function DefaultCard({
  image: _image,
  link,
  title,
  description,
  backgroundColor: _backgroundColor,
  icon,
  rounded: _rounded,
  alignVariant,
  credential,
}: IDefaultCardProps) {
  const hasIcon = icon !== undefined && icon !== null;

  // Untitled's team-section-simple-04 card. Selected by the item's existing backgroundColor
  // field so a directory needs no new schema column; there are no photos, so the avatar falls
  // back to initials.
  if (_backgroundColor === "light-gray" && !credential) {
    return (
      <div className="relative flex h-full flex-col items-center gap-5 bg-surface-raised px-6 py-6 ring-1 ring-secondary_alt transition hover:ring-brand">
        <Avatar
          border
          initials={title ? initialsOf(title) : undefined}
          alt={title ?? undefined}
          size="2xl"
        />
        <div className="text-center">
          {title && (
            <h3 className="text-lg font-semibold text-primary">
              {link?.href ? (
                // The whole card is the click target, so a directory of 21 reads as 21 links.
                <a href={link.href} className="after:absolute after:inset-0 hover:underline">
                  {title}
                </a>
              ) : (
                title
              )}
            </h3>
          )}
          {description && <p className="text-md text-pretty text-brand-secondary">{description}</p>}
        </div>
      </div>
    );
  }

  // Untitled's features-icon-cards-01 card (FeatureTextFeaturedIconCard), with the link in its
  // footer slot the way their section places it.
  if (hasIcon && !credential) {
    return (
      <div className="flex h-full flex-col gap-12 bg-surface-raised p-5 ring-1 ring-secondary_alt md:gap-16 md:p-6">
        <FeaturedIcon icon={icon} size="lg" color="brand" theme="dark" />
        <div className="mt-auto flex flex-col gap-4">
          <div>
            {title && <h3 className="text-lg font-semibold text-primary">{title}</h3>}
            {description && <p className="mt-1 text-md text-pretty text-tertiary">{description}</p>}
          </div>
          {link?.href && (
            <Button href={link.href} size="lg" color="link-color" className="self-start">
              {link.text}
            </Button>
          )}
        </div>
      </div>
    );
  }
  // A card carrying a login is a panel with its own edge, not a run of centred text: the
  // credentials are a form to read left to right, and centring them fights that.
  const isPanel = credential !== undefined && credential !== null;
  const isCentered = !isPanel && alignVariant === "center";

  const wrapperClassName = isPanel
    ? "flex h-full flex-col gap-4 rounded-2xl bg-surface-raised p-6 shadow-lg ring-1 ring-secondary_alt"
    : isCentered
      ? hasIcon
        ? "flex max-w-sm flex-col items-center gap-3 text-center md:gap-4"
        : "flex max-w-sm flex-col items-center gap-4 text-center"
      : "flex max-w-sm flex-col gap-4";

  return (
    <div className={wrapperClassName}>
      {hasIcon && <span className="size-6 text-icon-fg-brand">{icon}</span>}

      <div>
        {title && <h3 className="text-lg font-semibold text-primary">{title}</h3>}
        {description && <p className="mt-1 text-md text-tertiary">{description}</p>}
      </div>

      {/*
        Untitled UI's feature-text exposes a bare {footer} slot and never renders a button in it,
        so there is no per-card treatment of theirs to copy. Their link-colour Button is the
        closest thing they ship to an inline card action, and it keeps these four cards on the
        same component as every other CTA on the page.
      */}
      {credential && <DemoCredential email={credential.email} password={credential.password} />}

      {link?.href && (
        <Button href={link.href} size="md" color="link-color" className="mt-auto self-start">
          {link.text}
        </Button>
      )}
    </div>
  );
}
