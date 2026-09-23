import { Button } from "@/shared/ui/shadcn/base/buttons/button";
import { DemoCredential } from "@/components/demo/DemoCredential";
import type { IDefaultCardProps } from "./types";

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
