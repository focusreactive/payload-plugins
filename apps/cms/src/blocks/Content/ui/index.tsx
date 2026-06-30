import { cva } from "@/components/utils";
import type { SectionHeaderProps } from "@/components/SectionHeader";
import { SectionHeader } from "@/components/SectionHeader";

const gridVariants = cva(
  "flex flex-col items-start gap-10 lg:grid lg:grid-cols-2 lg:items-center lg:gap-[clamp(36px,6vw,90px)]",
  {
    defaultVariants: { layout: "image-text" },
    variants: {
      layout: {
        "image-text": "",
        "text-image": "lg:[direction:rtl] [&>*]:[direction:ltr]",
      },
    },
  }
);

interface ContentSectionProps {
  layout?: "image-text" | "text-image" | null;
  header?: SectionHeaderProps | null;
  image?: React.ReactNode;
  body?: React.ReactNode;
  actions?: React.ReactNode;
}

export function ContentSection({ layout, header, image, body, actions }: ContentSectionProps) {
  return (
    <div className={gridVariants({ layout: layout ?? "image-text" })}>
      {image && (
        <div className="relative aspect-[4/3] w-full overflow-hidden rounded-lg">{image}</div>
      )}

      <div className="flex max-w-[520px] flex-col gap-[18px]">
        {header && <SectionHeader {...header} className="gap-[18px]" />}

        {body}

        {actions && <div className="mt-2 flex flex-wrap items-center gap-4">{actions}</div>}
      </div>
    </div>
  );
}
