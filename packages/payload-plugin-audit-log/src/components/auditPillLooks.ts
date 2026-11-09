import type { Pill } from "@payloadcms/ui";
import type { ComponentProps } from "react";
import type { AuditAction, AuditActorType } from "../types";

type PillStyle = NonNullable<ComponentProps<typeof Pill>["pillStyle"]>;

export type PillLook = { label: string; pillStyle: PillStyle };

const look = (label: string, pillStyle: PillStyle): PillLook => ({ label, pillStyle });

export const ACTION_LOOKS: Record<AuditAction, PillLook> = {
  "doc.create": look("Created", "success"),
  "doc.update": look("Document updated", "light"),
  "doc.delete": look("Deleted", "error"),
  "doc.publish": look("Published", "success"),
  "doc.unpublish": look("Unpublished", "error"),
  "doc.restore": look("Version restored", "light"),
  "global.update": look("Global updated", "light"),
  "global.publish": look("Global published", "success"),
  "global.unpublish": look("Global unpublished", "error"),
  "auth.login": look("Signed in", "light"),
  "auth.logout": look("Signed out", "light"),
  "auth.login_failed": look("Sign-in failed", "warning"),
  "auth.password_reset_requested": look("Password reset requested", "warning"),
  "auth.password_reset": look("Password reset", "warning"),
  "audit.export": look("Exported", "light-gray"),
  "audit.retention_purge": look("Retention purge", "light-gray"),
};

export const ACTOR_TYPE_LOOKS: Record<AuditActorType, PillLook> = {
  user: look("User", "light"),
  api_key: look("API key", "white"),
  agent: look("AI agent", "warning"),
  system: look("System", "dark"),
  anonymous: look("Anonymous", "light-gray"),
};

const lookUp = (looks: Record<string, PillLook>) => {
  const byCode = new Map(Object.entries(looks));
  return (code: string): PillLook => byCode.get(code) ?? look(code, "light");
};

export const actionLook = lookUp(ACTION_LOOKS);
export const actorTypeLook = lookUp(ACTOR_TYPE_LOOKS);
