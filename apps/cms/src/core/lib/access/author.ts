import type { isAccessible } from "./types";

export const author: isAccessible = ({ req: { user } }) => Boolean(user) && "role" in user! && user.role === "author";
