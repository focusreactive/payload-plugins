export interface User {
  id: number;
  email?: string | null;
  [key: string]: unknown;
}
