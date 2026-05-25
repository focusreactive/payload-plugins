"use server";

import type { Where } from "payload";

import { FALLBACK_USERNAME, USERNAME_DEFAULT_FIELD_PATH } from "../constants";
import type {
  BaseServiceOptions,
  CommentsPluginConfigStorage,
  Response,
  User,
} from "../types";
import { getDefaultErrorMessage } from "../utils/error/getDefaultErrorMessage";
import { extractPayload } from "../utils/payload/extractPayload";
import { resolveUsername } from "../utils/user/resolveUsername";
import { getCurrentTenantId } from "./getCurrentTenantId";

export async function fetchMentionableUsers(
  options?: BaseServiceOptions
): Promise<Response<User[]>> {
  try {
    const payload = await extractPayload(options?.payload);

    const pluginConfig = payload.config.admin?.custom?.commentsPlugin as
      | CommentsPluginConfigStorage
      | undefined;
    const usernameFieldPath =
      pluginConfig?.usernameFieldPath ?? USERNAME_DEFAULT_FIELD_PATH;

    const tenantId = await getCurrentTenantId(payload);

    const where: Where = tenantId
      ? {
          or: [{ tenant: { equals: tenantId } }, { tenant: { exists: false } }],
        }
      : {};

    const usersRes = await payload.find({
      collection: "users",
      limit: 200,
      overrideAccess: true,
      select: {
        id: true,
        email: true,
        [usernameFieldPath]: true,
      },
      where: Object.keys(where).length ? where : undefined,
    });

    const data = usersRes.docs.map((user) => ({
      id: user.id,
      [usernameFieldPath]: resolveUsername(
        user as User,
        usernameFieldPath,
        FALLBACK_USERNAME
      ),
    })) as User[];

    return {
      data,
      success: true,
    };
  } catch (error) {
    console.error(`Failed to fetch mentionable users`, error);

    return {
      success: false,
      error: getDefaultErrorMessage(error),
    };
  }
}
