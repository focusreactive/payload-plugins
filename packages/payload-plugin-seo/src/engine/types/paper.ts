import type { Paper } from "yoastseo";

export type PaperData = InstanceType<typeof Paper>;

export interface PaperLike {
  getTitle?: () => string;
  getText?: () => string;
  getKeyword?: () => string;
}
