import type { isAccessible } from "./types";

export const user: isAccessible = ({ req: { user } }) => Boolean(user) && "role" in user! && user.role === "user";
