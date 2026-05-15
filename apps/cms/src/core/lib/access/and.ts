import type { AccessArgs, Where } from "payload";

import type { User } from "@/payload-types";

import type { isAccessible } from "./types";

export const and = (...accesses: isAccessible[]) => (args: AccessArgs<User>): boolean | Where => {
    const results = accesses.map((access) => access(args));

    if (results.some((r) => r === false)) return false;

    if (results.every((r) => r === true)) return true;

    const whereConstraints = results.filter(
      (r): r is Where => typeof r !== "boolean"
    ) as Where[];

    if (whereConstraints.length === 0) return false;

    if (whereConstraints.length === 1) return whereConstraints[0];

    return { and: whereConstraints };
  };
