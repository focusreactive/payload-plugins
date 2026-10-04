import type { HeaderNavDropdownItem } from "../types";
import { FeaturedCard } from "./FeaturedCard";
import { MegaLink } from "./MegaLink";

interface DropdownContentProps {
  item: HeaderNavDropdownItem;
}

/** Mega-menu panel (§6.6): eyebrow + links in two columns, plus the dark-blue featured card. */
export function DropdownContent({ item }: DropdownContentProps) {
  const hasFeatured = item.layout === "feature" && item.featured;

  return (
    <div
      className={
        hasFeatured
          ? "grid w-[760px] max-w-[calc(100vw-48px)] grid-cols-[minmax(0,2fr)_minmax(0,1fr)] gap-4"
          : "w-[560px] max-w-[calc(100vw-48px)]"
      }
    >
      <div>
        <p className="px-3 pb-2 pt-1 text-eyebrow text-ct-grey-700">{item.label}</p>
        <ul className="grid grid-cols-2 gap-x-2 gap-y-0.5">
          {item.links.map((link, index) => (
            <li key={`${link.label}-${index}`}>
              <MegaLink link={link} />
            </li>
          ))}
        </ul>
      </div>
      {hasFeatured && item.featured && <FeaturedCard featured={item.featured} />}
    </div>
  );
}
