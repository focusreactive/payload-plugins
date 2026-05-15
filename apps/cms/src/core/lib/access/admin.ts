import type { isAccessible } from "./types";

export const admin: isAccessible = ({ req: { user } }) => Boolean(user) && "role" in user! && user.role === "admin";
