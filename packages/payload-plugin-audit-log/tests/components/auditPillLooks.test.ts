import { describe, expect, it } from "vitest";
import {
  ACTION_LOOKS,
  ACTOR_TYPE_LOOKS,
  actionLook,
  actorTypeLook,
} from "../../src/components/auditPillLooks";
import { ACTOR_TYPES, AUDIT_ACTIONS } from "../../src/constants";

const PILL_STYLES = ["dark", "error", "light", "light-gray", "success", "warning", "white"];

describe("audit pill looks", () => {
  it("gives every action a readable label and a Pill style", () => {
    expect(Object.keys(ACTION_LOOKS).sort()).toEqual([...AUDIT_ACTIONS].sort());
    for (const action of AUDIT_ACTIONS) {
      const { label, pillStyle } = actionLook(action);
      expect(label).not.toBe(action);
      expect(PILL_STYLES).toContain(pillStyle);
    }
  });

  it("gives every actor type a readable label and a Pill style", () => {
    expect(Object.keys(ACTOR_TYPE_LOOKS).sort()).toEqual([...ACTOR_TYPES].sort());
    for (const type of ACTOR_TYPES) {
      expect(PILL_STYLES).toContain(actorTypeLook(type).pillStyle);
    }
  });

  it("colors by meaning", () => {
    expect(actionLook("doc.create").pillStyle).toBe("success");
    expect(actionLook("doc.publish").pillStyle).toBe("success");
    expect(actionLook("doc.delete").pillStyle).toBe("error");
    expect(actionLook("apikey.revoked").pillStyle).toBe("error");
    expect(actionLook("user.role_changed").pillStyle).toBe("warning");
    expect(actionLook("auth.login_failed").pillStyle).toBe("warning");
    expect(actionLook("doc.update").pillStyle).toBe("light");
    expect(actionLook("system.migration").pillStyle).toBe("dark");
    expect(actorTypeLook("agent")).toEqual({ label: "AI agent", pillStyle: "warning" });
  });

  it("shows an unknown code as it is", () => {
    expect(actionLook("doc.archive")).toEqual({ label: "doc.archive", pillStyle: "light" });
    expect(actionLook("toString")).toEqual({ label: "toString", pillStyle: "light" });
    expect(actorTypeLook("robot")).toEqual({ label: "robot", pillStyle: "light" });
  });
});
