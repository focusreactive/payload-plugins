import type { VariantProps } from "class-variance-authority";
import { cva } from "@/components/utils";

export const proseVariants = cva("prose max-w-full", {
  variants: {
    variant: {
      default: "",
      copy: "prose-copy",
      content: "prose-content",
      card: "prose-card",
    },
  },
  defaultVariants: {
    variant: "default",
  },
});

export type ProseVariant = NonNullable<VariantProps<typeof proseVariants>["variant"]>;
