"use server";

import type { Where } from "payload";
import type { BaseServiceOptions, MentionUser, Response } from "../types";
import { getDefaultErrorMessage } from "../utils/error/getDefaultErrorMessage";
import { extractPayload } from "../utils/payload/extractPayload";
import { getCurrentTenantId } from "./getCurrentTenantId";

export async function fetchMentionableUsers(options?: BaseServiceOptions): Promise<Response<MentionUser[]>> {
  try {
    const payload = await extractPayload(options?.payload);

    const tenantId = await getCurrentTenantId(payload);

    const where: Where =
      tenantId ?
        {
          or: [
            {
              tenant: {
                equals: tenantId,
              },
            },
            {
              tenant: {
                exists: false,
              },
            },
          ],
        }
      : {};

    const users = await payload.find({
      collection: "users",
      overrideAccess: true,
      limit: 200,
      where: Object.keys(where).length ? where : undefined,
      select: {
        id: true,
        name: true,
        email: true,
      },
    });

    const data = users.docs.map(({ id, name, email }) => ({
      id,
      name: name ?? email ?? "Unknown",
    })) as MentionUser[];

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
