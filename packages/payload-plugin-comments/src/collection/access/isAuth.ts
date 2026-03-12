import type { Access } from "payload";

export const isAuth: Access = ({ req: { user } }) => {
  if (!user) return false;

  return true;
};
