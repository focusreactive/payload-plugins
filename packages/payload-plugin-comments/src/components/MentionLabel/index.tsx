import { cn } from "../../utils/general/cn";

interface Props {
  name: string;
  isSelf: boolean;
}

export function MentionLabel({ name, isSelf }: Props) {
  return (
    <span
      className={cn(
        "font-medium rounded-sm px-0.5",
        isSelf ? "bg-[#f0be3621] text-[#a36e12]" : "bg-[#36c5f021] text-[#1264a3]",
      )}>
      @{name}
    </span>
  );
}
