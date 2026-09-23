import { Link } from "@/components/link";
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
}: IDefaultCardProps) {
  const isCentered = alignVariant === "center";
  const hasIcon = icon !== undefined && icon !== null;

  const wrapperClassName = isCentered
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

      {link?.href && <Link {...link} />}
    </div>
  );
}
