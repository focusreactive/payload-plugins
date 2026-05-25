import { cn, cva } from "../../../utils";
import { Image } from "../../ui/image";
import { Link } from "../../ui/link";
import type { IDefaultCardProps } from "./types";

export default function DefaultCard({
  image,
  link,
  title,
  description,
  // alignVariant,
  backgroundColor,
  rounded,
}: IDefaultCardProps) {
  return (
    <div
      className={cn(
        variants({
          backgroundColor,
        }),
        {
          // "items-center": alignVariant === "center",
          // "items-start": alignVariant === "left",
          // "items-end": alignVariant === "right",
          "rounded-2xl": rounded === "large",
        }
      )}
    >
      <div className="flex flex-col gap-y-12 text-left">
        <div className="text-textColor text-xl font-semibold">{title}</div>
        <div className="text-textSecondaryColor text-base">{description}</div>
        {link.href && <Link {...link} />}
      </div>
      {image?.src && (
        <div className="size-24 flex-none">
          <Image {...image} />
        </div>
      )}
    </div>
  );
}

const variants = cva("bg-bgColor flex flex-none gap-x-12 gap-y-3 p-12", {
  defaultVariants: {
    backgroundColor: "none",
    rounded: "large",
  },
  variants: {
    backgroundColor: {
      dark: "bg-bgColor",
      "dark-gray": "bg-bgColor",
      "gradient-2": "bg-gradient-to-tr from-primary2LightColor to-white",
      light: "bg-bgColor",
      "light-gray": "bg-bgColor",
      none: "bg-transparent",
    },
    rounded: {
      large: "rounded-2xl",
    },
  },
});
