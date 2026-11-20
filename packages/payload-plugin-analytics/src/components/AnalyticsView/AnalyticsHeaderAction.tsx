import type { PayloadRequest } from "payload";
import { canViewAnalytics } from "../../utils/access/canViewAnalytics";
import AnalyticsHeaderLink from "./AnalyticsHeaderLink";

interface AnalyticsHeaderActionProps {
  req?: PayloadRequest;
}

/** Server wrapper for the header link: rendered only for users who can open the analytics view. */
export default async function AnalyticsHeaderAction({ req }: AnalyticsHeaderActionProps) {
  if (!req || !(await canViewAnalytics(req))) return null;

  return <AnalyticsHeaderLink />;
}
