import { cva } from "class-variance-authority";
import type { VariantProps } from "class-variance-authority";
import NextImage from "next/image";

import type { Author } from "@/payload-types";

const fallbackVariants = cva("grid flex-none place-items-center rounded-pill bg-primary-soft font-semibold text-primary", {
  defaultVariants: {
    size: "md",
  },
  variants: {
    size: {
      md: "size-10",
      sm: "size-[34px] text-[0.9rem]",
    },
  },
});

const imageVariants = cva("relative flex-none overflow-hidden rounded-pill", {
  defaultVariants: {
    size: "md",
  },
  variants: {
    size: {
      md: "size-10",
      sm: "size-[34px]",
    },
  },
});

const imageSizes: Record<NonNullable<VariantProps<typeof imageVariants>["size"]>, string> = {
  md: "40px",
  sm: "34px",
};

interface AuthorAvatarProps {
  author: Author;
  size: NonNullable<VariantProps<typeof imageVariants>["size"]>;
}

export function AuthorAvatar({ author, size }: AuthorAvatarProps) {
  const avatar = typeof author.avatar === "object" && author.avatar !== null ? author.avatar : undefined;

  if (avatar?.url) {
    return (
      <span className={imageVariants({ size })}>
        <NextImage src={avatar.url} alt="" fill className="object-cover" quality={85} sizes={imageSizes[size]} />
      </span>
    );
  }

  return (
    <span aria-hidden className={fallbackVariants({ size })}>
      {author.name.charAt(0)}
    </span>
  );
}
