import type { Payload } from "payload";

import type { User } from "@/payload-types";

export type DemoPersona = { slug: string; user: User };

/**
 * A demo shows each role by switching between seeded accounts, and neither the prospect nor an agent
 * driving the browser should have to type a password to do it. Setting DEMO_PERSONA_EMAILS on one
 * deployment turns the switch on there and names the only accounts it may sign in as; with it unset,
 * the route 404s and the buttons do not render.
 */
export function demoPersonaEmails(): string[] {
  return (process.env.DEMO_PERSONA_EMAILS ?? "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
}

export function personaSlug(email: string): string {
  return email.split("@")[0];
}

export async function findDemoPersonas(payload: Payload): Promise<DemoPersona[]> {
  const emails = demoPersonaEmails();
  if (emails.length === 0) {
    return [];
  }
  const { docs } = await payload.find({
    collection: "users",
    depth: 0,
    limit: emails.length,
    overrideAccess: true,
    pagination: false,
    where: { email: { in: emails } },
  });
  return emails.flatMap((email) => {
    const user = docs.find((doc) => doc.email.toLowerCase() === email);
    return user ? [{ slug: personaSlug(email), user }] : [];
  });
}
