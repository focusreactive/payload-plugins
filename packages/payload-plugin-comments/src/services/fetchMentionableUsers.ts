"use server";

import type { Where } from "payload";
import type { BaseServiceOptions, CommentsPluginConfigStorage, Response, User } from "../types";
import { resolveUsername } from "../utils/user/resolveUsername";
import { getDefaultErrorMessage } from "../utils/error/getDefaultErrorMessage";
import { extractPayload } from "../utils/payload/extractPayload";
import { getCurrentTenantId } from "./getCurrentTenantId";
import { FALLBACK_USERNAME, USERNAME_DEFAULT_FIELD_PATH } from "../constants";

export async function fetchMentionableUsers(options?: BaseServiceOptions): Promise<Response<User[]>> {
  try {
    const payload = await extractPayload(options?.payload);

    const pluginConfig = payload.config.admin?.custom?.commentsPlugin as CommentsPluginConfigStorage | undefined;
    const usernameFieldPath = pluginConfig?.usernameFieldPath ?? USERNAME_DEFAULT_FIELD_PATH;

    const tenantId = await getCurrentTenantId(payload);

    const where: Where =
      tenantId ?
        {
          or: [{ tenant: { equals: tenantId } }, { tenant: { exists: false } }],
        }
      : {};

    const usersRes = await payload.find({
      collection: "users",
      overrideAccess: true,
      limit: 200,
      where: Object.keys(where).length ? where : undefined,
      select: {
        id: true,
        email: true,
        [usernameFieldPath]: true,
      },
    });

    const data = usersRes.docs.map((user) => ({
      id: user.id,
      [usernameFieldPath]: resolveUsername(user as User, usernameFieldPath, FALLBACK_USERNAME),
    })) as User[];

    return {
      success: true,
      data,
    };
  } catch (e) {
    console.error(`Failed to fetch mentionable users`, e);

    return {
      success: false,
      error: getDefaultErrorMessage(e),
    };
  }
}
