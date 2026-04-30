import { describe, it, expect } from "vitest";
import type {
  ContentReleasesPluginConfig,
  ReleaseStatus,
  ReleaseItemAction,
  ReleaseItemStatus,
  ConflictStrategy,
} from "../types";

describe("types", () => {
  it("should accept a valid minimal config", () => {
    const config: ContentReleasesPluginConfig = {
      enabledCollections: ["pages", "posts"],
    };
    expect(config.enabledCollections).toHaveLength(2);
  });

  it("should accept a full config", () => {
    const config: ContentReleasesPluginConfig = {
      enabledCollections: ["pages"],
      conflictStrategy: "fail",
      publishBatchSize: 50,
      useTransactions: true,
      access: {},
      hooks: {},
    };
    expect(config.conflictStrategy).toBe("fail");
  });

  it("should define all release statuses", () => {
    const statuses: ReleaseStatus[] = [
      "draft", "scheduled", "publishing", "published", "failed", "cancelled",
    ];
    expect(statuses).toHaveLength(6);
  });

  it("should define release item actions", () => {
    const actions: ReleaseItemAction[] = ["publish", "unpublish"];
    expect(actions).toHaveLength(2);
  });

  it("should define release item statuses", () => {
    const statuses: ReleaseItemStatus[] = ["pending", "published", "failed", "skipped"];
    expect(statuses).toHaveLength(4);
  });
});
