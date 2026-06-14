import { cva } from "../../../utils";
import type { SectionHeaderProps } from "../../ui/SectionHeader";
import { SectionHeader } from "../../ui/SectionHeader";

const gridVariants = cva("flex flex-col items-start gap-10 lg:grid lg:grid-cols-2 lg:items-center lg:gap-[clamp(36px,6vw,90px)]", {
  defaultVariants: { layout: "image-text" },
  variants: {
    layout: {
      "image-text": "",
      "text-image": "lg:[direction:rtl] [&>*]:[direction:ltr]",
    },
  },
});

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
      {image && <div className="relative aspect-[4/3] w-full overflow-hidden rounded-lg">{image}</div>}

      <div className="flex max-w-[520px] flex-col gap-[18px]">
        {header && <SectionHeader {...header} className="gap-[18px]" />}

        {body && (
          <div className="content-section-prose prose prose-lg max-w-none text-muted-foreground prose-p:text-muted-foreground prose-headings:font-display prose-headings:tracking-tight prose-headings:text-foreground prose-strong:text-foreground prose-a:text-primary prose-a:underline-offset-4 [&_.content-section-prose_ul>li+li]:mt-3 [&_ul]:m-0 [&_ul]:list-none [&_ul]:p-0 [&_ul>li]:relative [&_ul>li]:pl-[30px] [&_ul>li]:text-muted-foreground [&_ul>li]:before:absolute [&_ul>li]:before:left-0 [&_ul>li]:before:top-[7px] [&_ul>li]:before:size-4 [&_ul>li]:before:rounded-pill [&_ul>li]:before:bg-primary-soft [&_ul>li]:after:absolute [&_ul>li]:after:left-[5px] [&_ul>li]:after:top-[11px] [&_ul>li]:after:h-2 [&_ul>li]:after:w-[5px] [&_ul>li]:after:rotate-45 [&_ul>li]:after:border-b-2 [&_ul>li]:after:border-r-2 [&_ul>li]:after:border-primary">
            {body}
          </div>
        )}

        {actions && <div className="mt-2 flex flex-wrap items-center gap-4">{actions}</div>}
      </div>
    </div>
  );
}
