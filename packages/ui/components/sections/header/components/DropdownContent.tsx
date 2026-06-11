import type { HeaderNavDropdownItem } from "../types";
import { FeaturedCard } from "./FeaturedCard";
import { MegaLink } from "./MegaLink";

interface DropdownContentProps {
  item: HeaderNavDropdownItem;
}

export function DropdownContent({ item }: DropdownContentProps) {
  if (item.layout === "feature") {
    return (
      <div className="grid w-[540px] max-w-[min(540px,calc(100vw-48px))] grid-cols-2 gap-2">
        {item.featured && <FeaturedCard featured={item.featured} />}

        <div className="flex flex-col gap-0.5">
          {item.links.map((link, index) => (
            <MegaLink key={`${link.label}-${index}`} link={link} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="grid w-[560px] max-w-[min(560px,calc(100vw-48px))] grid-cols-2 gap-2">
      {item.links.map((link, index) => (
        <MegaLink key={`${link.label}-${index}`} link={link} />
      ))}
    </div>
  );
}
