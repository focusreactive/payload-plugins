import type { AccessArgs, Where } from "payload";

import type { User } from "@/payload-types";

import type { isAccessible } from "./types";

export const or = (...accesses: isAccessible[]) => (args: AccessArgs<User>): boolean | Where => {
    const results = accesses.map((access) => access(args));

    if (results.some((r) => r === true)) return true;

    if (results.every((r) => r === false)) return false;

    const whereConstraints = results.filter(
      (r): r is Where => typeof r !== "boolean"
    ) as Where[];

    if (whereConstraints.length === 0) return false;

    return { or: whereConstraints };
  };
