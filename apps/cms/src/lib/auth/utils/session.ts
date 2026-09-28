import { NextResponse } from "next/server";
import type { Payload } from "payload";
import { createLocalReq, getFieldsToSign, jwtSign } from "payload";
import { addSessionToUser } from "payload/shared";

import type { User } from "@/payload-types";

/**
 * Issues the same payload-token cookie a password login would, for a user the caller has already
 * identified by other means (an SSO callback, a demo persona link).
 */
export async function redirectWithSession({
  payload,
  user,
  redirectTo,
}: {
  payload: Payload;
  user: User;
  redirectTo: string;
}): Promise<NextResponse> {
  const usersCollection = payload.collections.users.config;
  if (!usersCollection?.auth) {
    throw new Error("Users collection auth config not found");
  }
  const { secret } = payload;
  if (!secret) {
    throw new Error("Payload secret not configured");
  }

  let sid: string | undefined;
  if (usersCollection.auth.useSessions) {
    const req = await createLocalReq({}, payload);
    const session = await addSessionToUser({
      collectionConfig: usersCollection,
      payload,
      req,
      user: { ...user, collection: "users" },
    });
    ({ sid } = session);
  }

  const fieldsToSign = getFieldsToSign({
    collectionConfig: usersCollection,
    email: user.email,
    sid,
    user: { ...user, collection: "users" },
  });
  const tokenExpiration = usersCollection.auth.tokenExpiration ?? 7200;
  const { token } = await jwtSign({
    fieldsToSign,
    secret,
    tokenExpiration,
  });

  const cookieName = `${payload.config.cookiePrefix ?? "payload"}-token`;
  const cookieOpts = usersCollection.auth.cookies ?? {};
  const isSecure = cookieOpts.secure ?? process.env.NODE_ENV === "production";
  const sameSite =
    cookieOpts.sameSite === false
      ? "lax"
      : ((cookieOpts.sameSite as "lax" | "strict" | "none") ?? "lax");

  const response = NextResponse.redirect(redirectTo);
  response.cookies.set(cookieName, token, {
    httpOnly: true,
    maxAge: tokenExpiration,
    path: "/",
    sameSite,
    secure: isSecure,
  });
  return response;
}
