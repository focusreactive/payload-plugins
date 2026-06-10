import { cva } from "class-variance-authority";

export const serpContainer = cva("", {
  variants: {
    mode: {
      desktop: "w-[600px] font-[arial,sans-serif]",
      mobile: "max-w-[368px] font-[Arial,Roboto-Regular,HelveticaNeue,sans-serif]",
    },
  },
});

export const serpUrlRow = cva("flex items-center gap-x-[12px] mb-[12px] pt-[1px] overflow-hidden whitespace-nowrap text-ellipsis", {
  variants: {
    mode: {
      desktop: "",
      mobile: "",
    },
  },
});

export const serpSiteName = cva("text-[14px] leading-[18px] text-black font-normal", {
  variants: {
    mode: {
      desktop: "",
      mobile: "max-w-[300px]",
    },
  },
});

export const serpHostname = cva("", {
  variants: {
    mode: {
      desktop: "text-[14px] leading-[1.3] text-[#4d5156]",
      mobile: "text-[12px] leading-[20px] text-[#70757a]",
    },
  },
});

export const serpTitle = cva("text-[20px] font-normal", {
  variants: {
    mode: {
      desktop: "block leading-[1.3] text-[#1a0dab] max-w-[600px] overflow-hidden text-ellipsis whitespace-nowrap",
      mobile: "leading-[26px] text-[#1558d6] line-clamp-2 max-h-[52px] overflow-hidden",
    },
  },
});

export const serpDescription = cva("text-[14px] [&_strong]:font-bold", {
  variants: {
    mode: {
      desktop: "leading-[1.58] text-[#4d5156] max-w-[600px]",
      mobile: "leading-[1.4] text-[#3c4043]",
    },
  },
});
