import type { CustomRegistrationKey } from "../../../types/query";

export interface BlockStateProps {
  loading?: boolean;
  error?: Error;
  onRetry?: () => void;
  missing?: CustomRegistrationKey[];
}
