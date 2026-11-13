import { CircleAlert, CircleCheck, TriangleAlert } from "lucide-react";
import type { Status } from "../../../engine/types/analysis";
import { STATUS_LABEL_KEY } from "../../../constants";
import { useSeoTranslation } from "../../../translations/useSeoTranslation";
import { cn } from "../../../utils/style";

const ICONS = { bad: CircleAlert, warn: TriangleAlert, good: CircleCheck } as const;
const COLORS = { bad: cn("text-seo-bad"), warn: cn("text-seo-warn"), good: cn("text-seo-good") };

export function StatusMark({ status }: { status: Status }) {
  const { t } = useSeoTranslation();
  const Icon = ICONS[status];

  return (
    <Icon
      size={16}
      strokeWidth={2.25}
      className={cn(COLORS[status], "flex-none")}
      role="img"
      aria-label={t(STATUS_LABEL_KEY[status])}
    />
  );
}
