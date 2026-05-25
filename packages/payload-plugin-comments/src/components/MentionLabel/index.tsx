import { cn } from "../../utils/general/cn";

interface Props {
  name: string;
  isSelf: boolean;
  isDeleted?: boolean;
  deletedSuffix?: string;
}

export function MentionLabel({ name, isSelf, isDeleted, deletedSuffix = "(deleted)" }: Props) {
  return (
    <span
      className={cn(
        "font-medium rounded-sm px-0.5",
        isDeleted ? "bg-(--theme-elevation-100) text-(--theme-elevation-500) opacity-70"
        : isSelf ? "bg-[#f0be3621] text-[#a36e12]"
        : "bg-[#36c5f021] text-[#1264a3]",
      )}>
      @{name}
      {isDeleted ? ` ${deletedSuffix}` : ""}
    </span>
  );
}
