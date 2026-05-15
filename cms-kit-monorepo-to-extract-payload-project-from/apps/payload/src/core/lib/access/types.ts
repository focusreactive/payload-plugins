import type { FieldAccessArgs } from "node_modules/payload/dist/fields/config/types";
import type { AccessArgs, Where } from "payload";

import type { User } from "@/payload-types";

export type isAccessible<T extends boolean | Where = boolean | Where> = (
  args:
    | AccessArgs<User>
    | FieldAccessArgs<User>
    | { req: { user: User; collection?: "users" } }
) => T;
