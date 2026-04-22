# Content Releases Plugin Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Create `@focus-reactive/payload-plugin-content-releases` — a Payload CMS v3 plugin that lets editors group content changes across collections into named "releases" and publish them atomically (manually or on schedule).

**Architecture:** The plugin creates two collections (`releases`, `release-items`), custom REST endpoints for publish/rollback/preview, and admin UI components. It stores document snapshots in `release-items` so pending changes never affect live content. Publishing applies all snapshots in a single DB transaction when supported. Optionally integrates with `@focus-reactive/payload-plugin-scheduling` for time-based release triggers.

**Tech Stack:** TypeScript (ESM), Payload CMS v3, tsup (build), Vitest (tests), React (admin components), `@payloadcms/ui`

---

## Phase 0: Project Scaffold & Test Infrastructure

### Task 1: Initialize package directory and config files

**Files:**
- Create: `packages/payload-plugin-content-releases/package.json`
- Create: `packages/payload-plugin-content-releases/tsconfig.json`
- Create: `packages/payload-plugin-content-releases/tsup.config.ts`
- Create: `packages/payload-plugin-content-releases/.gitignore`
- Create: `packages/payload-plugin-content-releases/src/index.ts`

**Step 1: Create package.json**

```json
{
  "name": "@focus-reactive/payload-plugin-content-releases",
  "version": "0.0.0-development",
  "description": "Payload CMS plugin for grouping and atomically publishing batches of content changes",
  "type": "module",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "import": "./dist/index.js",
      "types": "./dist/index.d.ts"
    }
  },
  "files": ["dist"],
  "repository": {
    "type": "git",
    "url": "https://github.com/focusreactive/payload-plugins",
    "directory": "packages/payload-plugin-content-releases"
  },
  "publishConfig": {
    "access": "public"
  },
  "scripts": {
    "build": "tsup",
    "dev": "tsup --watch",
    "test": "vitest run",
    "test:watch": "vitest",
    "lint": "eslint src/",
    "lint:fix": "eslint src/ --fix",
    "format": "prettier --write src/"
  },
  "peerDependencies": {
    "payload": "^3.0.0"
  },
  "devDependencies": {
    "@types/node": "^20.0.0",
    "payload": "3.79.0",
    "tsup": "^8.0.0",
    "typescript": "^5.0.0",
    "vitest": "^3.0.0"
  },
  "license": "MIT"
}
```

**Step 2: Create tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "es2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "jsx": "react-jsx",
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitOverride": true,
    "esModuleInterop": true,
    "forceConsistentCasingInFileNames": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "rootDir": "src",
    "outDir": "dist"
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

**Step 3: Create tsup.config.ts**

```typescript
import { defineConfig } from "tsup";

export default defineConfig({
  entry: {
    index: "src/index.ts",
  },
  format: ["esm"],
  dts: true,
  sourcemap: true,
  splitting: false,
  clean: true,
  external: ["payload"],
});
```

**Step 4: Create .gitignore**

```
node_modules/
dist/
```

**Step 5: Create src/index.ts (empty barrel)**

```typescript
export {};
```

**Step 6: Install dependencies**

Run: `cd /Users/pashahurs/Projects/payload-plugins && bun install`

**Step 7: Verify build**

Run: `bunx turbo run build --filter=@focus-reactive/payload-plugin-content-releases`
Expected: Build succeeds, creates `dist/index.js`

**Step 8: Commit**

```bash
git add packages/payload-plugin-content-releases/
git commit -m "chore: scaffold payload-plugin-content-releases package"
```

---

### Task 2: Set up Vitest test infrastructure

**Files:**
- Create: `packages/payload-plugin-content-releases/vitest.config.ts`
- Create: `packages/payload-plugin-content-releases/src/__tests__/setup.ts`
- Create: `packages/payload-plugin-content-releases/src/__tests__/plugin.test.ts`

**Step 1: Create vitest.config.ts**

```typescript
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    include: ["src/**/*.test.ts"],
    setupFiles: ["src/__tests__/setup.ts"],
  },
});
```

**Step 2: Create test setup file**

```typescript
// src/__tests__/setup.ts
// Global test setup — add shared mocks here as needed
```

**Step 3: Create a smoke test**

```typescript
// src/__tests__/plugin.test.ts
import { describe, it, expect } from "vitest";

describe("payload-plugin-content-releases", () => {
  it("should be importable", async () => {
    const mod = await import("../index");
    expect(mod).toBeDefined();
  });
});
```

**Step 4: Run the test**

Run: `cd packages/payload-plugin-content-releases && bunx vitest run`
Expected: 1 test passes

**Step 5: Commit**

```bash
git add packages/payload-plugin-content-releases/vitest.config.ts
git add packages/payload-plugin-content-releases/src/__tests__/
git commit -m "chore: add vitest test infrastructure for content-releases"
```

---

## Phase 1: Types, Constants & Core Plugin Shell

### Task 3: Define TypeScript types

**Files:**
- Create: `packages/payload-plugin-content-releases/src/types.ts`
- Create: `packages/payload-plugin-content-releases/src/__tests__/types.test.ts`

**Step 1: Write the failing test**

```typescript
// src/__tests__/types.test.ts
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
      "draft",
      "scheduled",
      "publishing",
      "published",
      "failed",
      "cancelled",
    ];
    expect(statuses).toHaveLength(6);
  });

  it("should define release item actions", () => {
    const actions: ReleaseItemAction[] = ["publish", "unpublish"];
    expect(actions).toHaveLength(2);
  });

  it("should define release item statuses", () => {
    const statuses: ReleaseItemStatus[] = [
      "pending",
      "published",
      "failed",
      "skipped",
    ];
    expect(statuses).toHaveLength(4);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `cd packages/payload-plugin-content-releases && bunx vitest run src/__tests__/types.test.ts`
Expected: FAIL — cannot import from `../types`

**Step 3: Write types**

```typescript
// src/types.ts
import type { Access, PayloadRequest } from "payload";

export type ReleaseStatus =
  | "draft"
  | "scheduled"
  | "publishing"
  | "published"
  | "failed"
  | "cancelled";

export type ReleaseItemAction = "publish" | "unpublish";

export type ReleaseItemStatus = "pending" | "published" | "failed" | "skipped";

export type ConflictStrategy = "fail" | "force";

export interface ContentReleasesPluginConfig {
  /** Collection slugs that can participate in releases */
  enabledCollections: string[];

  /** What to do when a document's version changed since staging.
   * - `"fail"`: skip the item and mark the release as failed
   * - `"force"`: overwrite regardless
   * @default "fail"
   */
  conflictStrategy?: ConflictStrategy;

  /** Number of items to process per batch during publish.
   * @default 20
   */
  publishBatchSize?: number;

  /** Use DB transactions if the adapter supports them.
   * @default true
   */
  useTransactions?: boolean;

  /** Access control overrides for the releases and release-items collections */
  access?: {
    releases?: {
      create?: Access;
      read?: Access;
      update?: Access;
      delete?: Access;
    };
    releaseItems?: {
      create?: Access;
      read?: Access;
      update?: Access;
      delete?: Access;
    };
  };

  /** Lifecycle hooks */
  hooks?: {
    afterPublish?: (args: { releaseId: string; req: PayloadRequest }) => void | Promise<void>;
    onPublishError?: (args: {
      releaseId: string;
      errors: Array<{ collection: string; docId: string; error: string }>;
      req: PayloadRequest;
    }) => void | Promise<void>;
  };
}
```

**Step 4: Run test to verify it passes**

Run: `cd packages/payload-plugin-content-releases && bunx vitest run src/__tests__/types.test.ts`
Expected: PASS (all 5 tests)

**Step 5: Commit**

```bash
git add packages/payload-plugin-content-releases/src/types.ts
git add packages/payload-plugin-content-releases/src/__tests__/types.test.ts
git commit -m "feat(content-releases): define plugin config and domain types"
```

---

### Task 4: Define constants

**Files:**
- Create: `packages/payload-plugin-content-releases/src/constants.ts`

**Step 1: Create constants**

```typescript
// src/constants.ts
export const PLUGIN_NAME = "payload-plugin-content-releases";

export const RELEASES_SLUG = "releases" as const;
export const RELEASE_ITEMS_SLUG = "release-items" as const;

export const RELEASE_STATUSES = [
  "draft",
  "scheduled",
  "publishing",
  "published",
  "failed",
  "cancelled",
] as const;

export const RELEASE_ITEM_ACTIONS = ["publish", "unpublish"] as const;

export const RELEASE_ITEM_STATUSES = [
  "pending",
  "published",
  "failed",
  "skipped",
] as const;

export const DEFAULT_CONFLICT_STRATEGY = "fail" as const;
export const DEFAULT_PUBLISH_BATCH_SIZE = 20;
export const DEFAULT_USE_TRANSACTIONS = true;
```

**Step 2: Commit**

```bash
git add packages/payload-plugin-content-releases/src/constants.ts
git commit -m "feat(content-releases): add constants"
```

---

### Task 5: Create the `releases` collection definition

**Files:**
- Create: `packages/payload-plugin-content-releases/src/collections/releases.ts`
- Create: `packages/payload-plugin-content-releases/src/__tests__/collections/releases.test.ts`

**Step 1: Write the failing test**

```typescript
// src/__tests__/collections/releases.test.ts
import { describe, it, expect } from "vitest";
import { buildReleasesCollection } from "../../collections/releases";
import { RELEASES_SLUG, RELEASE_STATUSES } from "../../constants";

describe("releases collection", () => {
  const collection = buildReleasesCollection();

  it("should have the correct slug", () => {
    expect(collection.slug).toBe(RELEASES_SLUG);
  });

  it("should have required name field", () => {
    const nameField = collection.fields.find(
      (f: any) => f.name === "name"
    ) as any;
    expect(nameField).toBeDefined();
    expect(nameField.type).toBe("text");
    expect(nameField.required).toBe(true);
  });

  it("should have status field with all valid statuses", () => {
    const statusField = collection.fields.find(
      (f: any) => f.name === "status"
    ) as any;
    expect(statusField).toBeDefined();
    expect(statusField.type).toBe("select");
    const optionValues = statusField.options.map((o: any) => o.value ?? o);
    for (const status of RELEASE_STATUSES) {
      expect(optionValues).toContain(status);
    }
  });

  it("should have scheduledAt date field", () => {
    const field = collection.fields.find(
      (f: any) => f.name === "scheduledAt"
    ) as any;
    expect(field).toBeDefined();
    expect(field.type).toBe("date");
  });

  it("should have publishedAt date field", () => {
    const field = collection.fields.find(
      (f: any) => f.name === "publishedAt"
    ) as any;
    expect(field).toBeDefined();
    expect(field.type).toBe("date");
  });

  it("should have description textarea field", () => {
    const field = collection.fields.find(
      (f: any) => f.name === "description"
    ) as any;
    expect(field).toBeDefined();
    expect(field.type).toBe("textarea");
  });

  it("should have rollbackSnapshot json field", () => {
    const field = collection.fields.find(
      (f: any) => f.name === "rollbackSnapshot"
    ) as any;
    expect(field).toBeDefined();
    expect(field.type).toBe("json");
  });

  it("should have errorLog json field", () => {
    const field = collection.fields.find(
      (f: any) => f.name === "errorLog"
    ) as any;
    expect(field).toBeDefined();
    expect(field.type).toBe("json");
  });

  it("should apply custom access if provided", () => {
    const customAccess = { read: () => true };
    const col = buildReleasesCollection({ access: customAccess });
    expect(col.access?.read).toBe(customAccess.read);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `cd packages/payload-plugin-content-releases && bunx vitest run src/__tests__/collections/releases.test.ts`
Expected: FAIL — module not found

**Step 3: Implement the collection**

```typescript
// src/collections/releases.ts
import type { CollectionConfig, Access } from "payload";
import { RELEASES_SLUG, RELEASE_STATUSES } from "../constants";

interface BuildReleasesCollectionOptions {
  access?: {
    create?: Access;
    read?: Access;
    update?: Access;
    delete?: Access;
  };
}

export function buildReleasesCollection(
  options?: BuildReleasesCollectionOptions,
): CollectionConfig {
  return {
    slug: RELEASES_SLUG,
    labels: {
      singular: "Release",
      plural: "Releases",
    },
    admin: {
      useAsTitle: "name",
      defaultColumns: ["name", "status", "scheduledAt", "createdAt"],
    },
    access: options?.access,
    fields: [
      {
        name: "name",
        type: "text",
        required: true,
      },
      {
        name: "description",
        type: "textarea",
      },
      {
        name: "status",
        type: "select",
        required: true,
        defaultValue: "draft",
        options: RELEASE_STATUSES.map((s) => ({ label: s.charAt(0).toUpperCase() + s.slice(1), value: s })),
        admin: {
          position: "sidebar",
        },
      },
      {
        name: "scheduledAt",
        type: "date",
        admin: {
          position: "sidebar",
          date: {
            pickerAppearance: "dayAndTime",
          },
        },
      },
      {
        name: "publishedAt",
        type: "date",
        admin: {
          position: "sidebar",
          readOnly: true,
        },
      },
      {
        name: "rollbackSnapshot",
        type: "json",
        admin: {
          hidden: true,
        },
      },
      {
        name: "errorLog",
        type: "json",
        admin: {
          readOnly: true,
        },
      },
    ],
  };
}
```

**Step 4: Run test to verify it passes**

Run: `cd packages/payload-plugin-content-releases && bunx vitest run src/__tests__/collections/releases.test.ts`
Expected: PASS (all 9 tests)

**Step 5: Commit**

```bash
git add packages/payload-plugin-content-releases/src/collections/releases.ts
git add packages/payload-plugin-content-releases/src/__tests__/collections/
git commit -m "feat(content-releases): add releases collection definition"
```

---

### Task 6: Create the `release-items` collection definition

**Files:**
- Create: `packages/payload-plugin-content-releases/src/collections/releaseItems.ts`
- Create: `packages/payload-plugin-content-releases/src/__tests__/collections/releaseItems.test.ts`

**Step 1: Write the failing test**

```typescript
// src/__tests__/collections/releaseItems.test.ts
import { describe, it, expect } from "vitest";
import { buildReleaseItemsCollection } from "../../collections/releaseItems";
import {
  RELEASE_ITEMS_SLUG,
  RELEASES_SLUG,
  RELEASE_ITEM_ACTIONS,
  RELEASE_ITEM_STATUSES,
} from "../../constants";

describe("release-items collection", () => {
  const enabledCollections = ["pages", "posts", "products"];
  const collection = buildReleaseItemsCollection(enabledCollections);

  it("should have the correct slug", () => {
    expect(collection.slug).toBe(RELEASE_ITEMS_SLUG);
  });

  it("should have release relationship to releases collection", () => {
    const field = collection.fields.find(
      (f: any) => f.name === "release"
    ) as any;
    expect(field).toBeDefined();
    expect(field.type).toBe("relationship");
    expect(field.relationTo).toBe(RELEASES_SLUG);
    expect(field.required).toBe(true);
  });

  it("should have targetCollection select with enabled collections", () => {
    const field = collection.fields.find(
      (f: any) => f.name === "targetCollection"
    ) as any;
    expect(field).toBeDefined();
    expect(field.type).toBe("select");
    const values = field.options.map((o: any) => o.value ?? o);
    expect(values).toEqual(enabledCollections);
  });

  it("should have targetDoc text field", () => {
    const field = collection.fields.find(
      (f: any) => f.name === "targetDoc"
    ) as any;
    expect(field).toBeDefined();
    expect(field.type).toBe("text");
    expect(field.required).toBe(true);
  });

  it("should have action select field", () => {
    const field = collection.fields.find(
      (f: any) => f.name === "action"
    ) as any;
    expect(field).toBeDefined();
    expect(field.type).toBe("select");
    const values = field.options.map((o: any) => o.value ?? o);
    for (const action of RELEASE_ITEM_ACTIONS) {
      expect(values).toContain(action);
    }
  });

  it("should have status select field", () => {
    const field = collection.fields.find(
      (f: any) => f.name === "status"
    ) as any;
    expect(field).toBeDefined();
    expect(field.type).toBe("select");
    const values = field.options.map((o: any) => o.value ?? o);
    for (const status of RELEASE_ITEM_STATUSES) {
      expect(values).toContain(status);
    }
  });

  it("should have snapshot json field", () => {
    const field = collection.fields.find(
      (f: any) => f.name === "snapshot"
    ) as any;
    expect(field).toBeDefined();
    expect(field.type).toBe("json");
  });

  it("should have baseVersion text field", () => {
    const field = collection.fields.find(
      (f: any) => f.name === "baseVersion"
    ) as any;
    expect(field).toBeDefined();
    expect(field.type).toBe("text");
  });
});
```

**Step 2: Run test to verify it fails**

Run: `cd packages/payload-plugin-content-releases && bunx vitest run src/__tests__/collections/releaseItems.test.ts`
Expected: FAIL

**Step 3: Implement the collection**

```typescript
// src/collections/releaseItems.ts
import type { CollectionConfig, Access } from "payload";
import {
  RELEASE_ITEMS_SLUG,
  RELEASES_SLUG,
  RELEASE_ITEM_ACTIONS,
  RELEASE_ITEM_STATUSES,
} from "../constants";

interface BuildReleaseItemsCollectionOptions {
  access?: {
    create?: Access;
    read?: Access;
    update?: Access;
    delete?: Access;
  };
}

export function buildReleaseItemsCollection(
  enabledCollections: string[],
  options?: BuildReleaseItemsCollectionOptions,
): CollectionConfig {
  return {
    slug: RELEASE_ITEMS_SLUG,
    labels: {
      singular: "Release Item",
      plural: "Release Items",
    },
    admin: {
      defaultColumns: ["targetCollection", "targetDoc", "action", "status"],
    },
    access: options?.access,
    fields: [
      {
        name: "release",
        type: "relationship",
        relationTo: RELEASES_SLUG,
        required: true,
        index: true,
      },
      {
        name: "targetCollection",
        type: "select",
        required: true,
        options: enabledCollections.map((slug) => ({
          label: slug.charAt(0).toUpperCase() + slug.slice(1),
          value: slug,
        })),
      },
      {
        name: "targetDoc",
        type: "text",
        required: true,
      },
      {
        name: "action",
        type: "select",
        required: true,
        defaultValue: "publish",
        options: RELEASE_ITEM_ACTIONS.map((a) => ({
          label: a.charAt(0).toUpperCase() + a.slice(1),
          value: a,
        })),
      },
      {
        name: "status",
        type: "select",
        required: true,
        defaultValue: "pending",
        options: RELEASE_ITEM_STATUSES.map((s) => ({
          label: s.charAt(0).toUpperCase() + s.slice(1),
          value: s,
        })),
        admin: {
          position: "sidebar",
        },
      },
      {
        name: "snapshot",
        type: "json",
        required: true,
      },
      {
        name: "baseVersion",
        type: "text",
      },
    ],
  };
}
```

**Step 4: Run test to verify it passes**

Run: `cd packages/payload-plugin-content-releases && bunx vitest run src/__tests__/collections/releaseItems.test.ts`
Expected: PASS (all 8 tests)

**Step 5: Commit**

```bash
git add packages/payload-plugin-content-releases/src/collections/releaseItems.ts
git add packages/payload-plugin-content-releases/src/__tests__/collections/releaseItems.test.ts
git commit -m "feat(content-releases): add release-items collection definition"
```

---

### Task 7: Create the main plugin function

**Files:**
- Create: `packages/payload-plugin-content-releases/src/plugin.ts`
- Create: `packages/payload-plugin-content-releases/src/__tests__/plugin-integration.test.ts`
- Modify: `packages/payload-plugin-content-releases/src/index.ts`

**Step 1: Write the failing test**

```typescript
// src/__tests__/plugin-integration.test.ts
import { describe, it, expect } from "vitest";
import { contentReleasesPlugin } from "../plugin";
import { RELEASES_SLUG, RELEASE_ITEMS_SLUG } from "../constants";
import type { Config } from "payload";

function makeBaseConfig(overrides?: Partial<Config>): Config {
  return {
    collections: [
      { slug: "pages", fields: [] },
      { slug: "posts", fields: [] },
    ],
    globals: [],
    ...overrides,
  } as Config;
}

describe("contentReleasesPlugin", () => {
  it("should return a function", () => {
    const plugin = contentReleasesPlugin({
      enabledCollections: ["pages"],
    });
    expect(typeof plugin).toBe("function");
  });

  it("should inject releases collection", () => {
    const plugin = contentReleasesPlugin({
      enabledCollections: ["pages"],
    });
    const config = plugin(makeBaseConfig());
    const releases = config.collections?.find(
      (c) => c.slug === RELEASES_SLUG
    );
    expect(releases).toBeDefined();
  });

  it("should inject release-items collection", () => {
    const plugin = contentReleasesPlugin({
      enabledCollections: ["pages"],
    });
    const config = plugin(makeBaseConfig());
    const items = config.collections?.find(
      (c) => c.slug === RELEASE_ITEMS_SLUG
    );
    expect(items).toBeDefined();
  });

  it("should preserve existing collections", () => {
    const plugin = contentReleasesPlugin({
      enabledCollections: ["pages"],
    });
    const config = plugin(makeBaseConfig());
    const pages = config.collections?.find((c) => c.slug === "pages");
    const posts = config.collections?.find((c) => c.slug === "posts");
    expect(pages).toBeDefined();
    expect(posts).toBeDefined();
  });

  it("should warn about unknown collection slugs", () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const plugin = contentReleasesPlugin({
      enabledCollections: ["nonexistent"],
    });
    plugin(makeBaseConfig());
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining("nonexistent")
    );
    warnSpy.mockRestore();
  });

  it("should pass access config to releases collection", () => {
    const readFn = () => true;
    const plugin = contentReleasesPlugin({
      enabledCollections: ["pages"],
      access: {
        releases: { read: readFn },
      },
    });
    const config = plugin(makeBaseConfig());
    const releases = config.collections?.find(
      (c) => c.slug === RELEASES_SLUG
    );
    expect((releases as any)?.access?.read).toBe(readFn);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `cd packages/payload-plugin-content-releases && bunx vitest run src/__tests__/plugin-integration.test.ts`
Expected: FAIL

**Step 3: Implement the plugin**

```typescript
// src/plugin.ts
import type { Config, Plugin } from "payload";
import type { ContentReleasesPluginConfig } from "./types";
import { PLUGIN_NAME } from "./constants";
import { buildReleasesCollection } from "./collections/releases";
import { buildReleaseItemsCollection } from "./collections/releaseItems";

export function contentReleasesPlugin(
  options: ContentReleasesPluginConfig,
): Plugin {
  const { enabledCollections, access } = options;

  return (config: Config): Config => {
    // Warn about unknown collection slugs
    for (const slug of enabledCollections) {
      if (!config.collections?.find((c) => c.slug === slug)) {
        console.warn(
          `[${PLUGIN_NAME}] Unknown collection slug: "${slug}". It will be included in release-items options but may not exist.`,
        );
      }
    }

    const releasesCollection = buildReleasesCollection({
      access: access?.releases,
    });

    const releaseItemsCollection = buildReleaseItemsCollection(
      enabledCollections,
      { access: access?.releaseItems },
    );

    return {
      ...config,
      collections: [
        ...(config.collections ?? []),
        releasesCollection,
        releaseItemsCollection,
      ],
    };
  };
}
```

**Step 4: Update barrel export**

```typescript
// src/index.ts
export { contentReleasesPlugin } from "./plugin";
export type { ContentReleasesPluginConfig } from "./types";
export type {
  ReleaseStatus,
  ReleaseItemAction,
  ReleaseItemStatus,
  ConflictStrategy,
} from "./types";
```

**Step 5: Run test to verify it passes**

Run: `cd packages/payload-plugin-content-releases && bunx vitest run src/__tests__/plugin-integration.test.ts`
Expected: PASS (all 6 tests)

**Step 6: Run all tests**

Run: `cd packages/payload-plugin-content-releases && bunx vitest run`
Expected: All tests pass

**Step 7: Build**

Run: `bunx turbo run build --filter=@focus-reactive/payload-plugin-content-releases`
Expected: Build succeeds

**Step 8: Commit**

```bash
git add packages/payload-plugin-content-releases/src/plugin.ts
git add packages/payload-plugin-content-releases/src/index.ts
git add packages/payload-plugin-content-releases/src/__tests__/plugin-integration.test.ts
git commit -m "feat(content-releases): implement core plugin function with collection injection"
```

---

## Phase 2: Release Lifecycle Validation

### Task 8: Implement release status transition validation

**Files:**
- Create: `packages/payload-plugin-content-releases/src/validation/statusTransitions.ts`
- Create: `packages/payload-plugin-content-releases/src/__tests__/validation/statusTransitions.test.ts`

**Step 1: Write the failing test**

```typescript
// src/__tests__/validation/statusTransitions.test.ts
import { describe, it, expect } from "vitest";
import { isValidTransition, VALID_TRANSITIONS } from "../../validation/statusTransitions";
import type { ReleaseStatus } from "../../types";

describe("isValidTransition", () => {
  const validCases: Array<[ReleaseStatus, ReleaseStatus]> = [
    ["draft", "scheduled"],
    ["draft", "publishing"],
    ["draft", "cancelled"],
    ["scheduled", "draft"],
    ["scheduled", "publishing"],
    ["publishing", "published"],
    ["publishing", "failed"],
    ["failed", "draft"],
  ];

  const invalidCases: Array<[ReleaseStatus, ReleaseStatus]> = [
    ["published", "draft"],
    ["published", "cancelled"],
    ["cancelled", "draft"],
    ["cancelled", "publishing"],
    ["publishing", "cancelled"],
    ["draft", "published"],
    ["draft", "failed"],
    ["scheduled", "published"],
  ];

  it.each(validCases)(
    "should allow transition from %s to %s",
    (from, to) => {
      expect(isValidTransition(from, to)).toBe(true);
    },
  );

  it.each(invalidCases)(
    "should reject transition from %s to %s",
    (from, to) => {
      expect(isValidTransition(from, to)).toBe(false);
    },
  );

  it("should reject same-state transitions", () => {
    expect(isValidTransition("draft", "draft")).toBe(false);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `cd packages/payload-plugin-content-releases && bunx vitest run src/__tests__/validation/statusTransitions.test.ts`
Expected: FAIL

**Step 3: Implement**

```typescript
// src/validation/statusTransitions.ts
import type { ReleaseStatus } from "../types";

export const VALID_TRANSITIONS: Record<ReleaseStatus, ReleaseStatus[]> = {
  draft: ["scheduled", "publishing", "cancelled"],
  scheduled: ["draft", "publishing"],
  publishing: ["published", "failed"],
  published: [],
  failed: ["draft"],
  cancelled: [],
};

export function isValidTransition(
  from: ReleaseStatus,
  to: ReleaseStatus,
): boolean {
  return VALID_TRANSITIONS[from]?.includes(to) ?? false;
}
```

**Step 4: Run test to verify it passes**

Run: `cd packages/payload-plugin-content-releases && bunx vitest run src/__tests__/validation/statusTransitions.test.ts`
Expected: PASS (all tests)

**Step 5: Commit**

```bash
git add packages/payload-plugin-content-releases/src/validation/
git add packages/payload-plugin-content-releases/src/__tests__/validation/
git commit -m "feat(content-releases): add release status transition validation"
```

---

### Task 9: Implement releases `beforeChange` hook (status enforcement)

**Files:**
- Create: `packages/payload-plugin-content-releases/src/hooks/releasesBeforeChange.ts`
- Create: `packages/payload-plugin-content-releases/src/__tests__/hooks/releasesBeforeChange.test.ts`

**Step 1: Write the failing test**

```typescript
// src/__tests__/hooks/releasesBeforeChange.test.ts
import { describe, it, expect } from "vitest";
import { releasesBeforeChange } from "../../hooks/releasesBeforeChange";

function makeArgs(data: Record<string, any>, originalDoc?: Record<string, any>) {
  return {
    data,
    originalDoc: originalDoc ?? {},
    req: {} as any,
    operation: "update" as const,
  };
}

describe("releasesBeforeChange", () => {
  it("should allow creating a release with draft status", () => {
    const args = {
      data: { name: "My Release", status: "draft" },
      req: {} as any,
      operation: "create" as const,
    };
    const result = releasesBeforeChange(args as any);
    expect(result.status).toBe("draft");
  });

  it("should force draft status on create regardless of input", () => {
    const args = {
      data: { name: "My Release", status: "published" },
      req: {} as any,
      operation: "create" as const,
    };
    const result = releasesBeforeChange(args as any);
    expect(result.status).toBe("draft");
  });

  it("should allow valid transition from draft to scheduled", () => {
    const result = releasesBeforeChange(
      makeArgs({ status: "scheduled" }, { status: "draft" }) as any,
    );
    expect(result.status).toBe("scheduled");
  });

  it("should throw on invalid transition from published to draft", () => {
    expect(() =>
      releasesBeforeChange(
        makeArgs({ status: "draft" }, { status: "published" }) as any,
      ),
    ).toThrow(/Invalid status transition/);
  });

  it("should throw on invalid transition from cancelled to draft", () => {
    expect(() =>
      releasesBeforeChange(
        makeArgs({ status: "draft" }, { status: "cancelled" }) as any,
      ),
    ).toThrow(/Invalid status transition/);
  });

  it("should pass through unchanged status", () => {
    const result = releasesBeforeChange(
      makeArgs({ status: "draft", name: "Updated" }, { status: "draft" }) as any,
    );
    expect(result.name).toBe("Updated");
  });

  it("should set publishedAt when transitioning to published", () => {
    const result = releasesBeforeChange(
      makeArgs({ status: "published" }, { status: "publishing" }) as any,
    );
    expect(result.publishedAt).toBeDefined();
  });
});
```

**Step 2: Run test to verify it fails**

Run: `cd packages/payload-plugin-content-releases && bunx vitest run src/__tests__/hooks/releasesBeforeChange.test.ts`
Expected: FAIL

**Step 3: Implement the hook**

```typescript
// src/hooks/releasesBeforeChange.ts
import type { CollectionBeforeChangeHook } from "payload";
import type { ReleaseStatus } from "../types";
import { isValidTransition } from "../validation/statusTransitions";

export const releasesBeforeChange: CollectionBeforeChangeHook = ({
  data,
  originalDoc,
  operation,
}) => {
  // Force draft on creation
  if (operation === "create") {
    return { ...data, status: "draft" };
  }

  const currentStatus = (originalDoc as any)?.status as ReleaseStatus | undefined;
  const newStatus = data.status as ReleaseStatus | undefined;

  // If status hasn't changed, pass through
  if (!newStatus || !currentStatus || newStatus === currentStatus) {
    return data;
  }

  // Validate transition
  if (!isValidTransition(currentStatus, newStatus)) {
    throw new Error(
      `Invalid status transition: "${currentStatus}" → "${newStatus}". Allowed transitions from "${currentStatus}": ${JSON.stringify(
        (await import("../validation/statusTransitions")).VALID_TRANSITIONS[currentStatus],
      )}`,
    );
  }

  // Set publishedAt timestamp when transitioning to published
  if (newStatus === "published") {
    return { ...data, publishedAt: new Date().toISOString() };
  }

  return data;
};
```

**Important fix — the dynamic import above is awkward. Use a simpler approach:**

```typescript
// src/hooks/releasesBeforeChange.ts
import type { CollectionBeforeChangeHook } from "payload";
import type { ReleaseStatus } from "../types";
import { isValidTransition, VALID_TRANSITIONS } from "../validation/statusTransitions";

export const releasesBeforeChange: CollectionBeforeChangeHook = ({
  data,
  originalDoc,
  operation,
}) => {
  if (operation === "create") {
    return { ...data, status: "draft" };
  }

  const currentStatus = (originalDoc as any)?.status as ReleaseStatus | undefined;
  const newStatus = data.status as ReleaseStatus | undefined;

  if (!newStatus || !currentStatus || newStatus === currentStatus) {
    return data;
  }

  if (!isValidTransition(currentStatus, newStatus)) {
    throw new Error(
      `Invalid status transition: "${currentStatus}" → "${newStatus}". Allowed from "${currentStatus}": [${VALID_TRANSITIONS[currentStatus].join(", ")}]`,
    );
  }

  if (newStatus === "published") {
    return { ...data, publishedAt: new Date().toISOString() };
  }

  return data;
};
```

**Step 4: Run test to verify it passes**

Run: `cd packages/payload-plugin-content-releases && bunx vitest run src/__tests__/hooks/releasesBeforeChange.test.ts`
Expected: PASS (all 7 tests)

**Step 5: Commit**

```bash
git add packages/payload-plugin-content-releases/src/hooks/
git add packages/payload-plugin-content-releases/src/__tests__/hooks/
git commit -m "feat(content-releases): add releases beforeChange hook with status transition enforcement"
```

---

### Task 10: Implement release-items `beforeChange` hook (draft-only editing + uniqueness)

**Files:**
- Create: `packages/payload-plugin-content-releases/src/hooks/releaseItemsBeforeChange.ts`
- Create: `packages/payload-plugin-content-releases/src/__tests__/hooks/releaseItemsBeforeChange.test.ts`

**Step 1: Write the failing test**

```typescript
// src/__tests__/hooks/releaseItemsBeforeChange.test.ts
import { describe, it, expect, vi } from "vitest";
import { buildReleaseItemsBeforeChange } from "../../hooks/releaseItemsBeforeChange";

function makePayload(releaseStatus: string, existingItems: any[] = []) {
  return {
    findByID: vi.fn().mockResolvedValue({ status: releaseStatus }),
    find: vi.fn().mockResolvedValue({ docs: existingItems }),
  };
}

function makeArgs(
  data: Record<string, any>,
  payload: any,
  operation: "create" | "update" = "create",
  originalDoc?: Record<string, any>,
) {
  return {
    data,
    originalDoc,
    operation,
    req: { payload },
  };
}

describe("releaseItemsBeforeChange", () => {
  const hook = buildReleaseItemsBeforeChange();

  it("should allow adding items to a draft release", async () => {
    const payload = makePayload("draft");
    const data = {
      release: "rel-1",
      targetCollection: "pages",
      targetDoc: "doc-1",
      snapshot: { title: "Hello" },
    };
    const result = await hook(makeArgs(data, payload) as any);
    expect(result).toEqual(data);
  });

  it("should reject adding items to a non-draft release", async () => {
    const payload = makePayload("scheduled");
    const data = {
      release: "rel-1",
      targetCollection: "pages",
      targetDoc: "doc-1",
    };
    await expect(
      hook(makeArgs(data, payload) as any),
    ).rejects.toThrow(/can only be modified.*draft/i);
  });

  it("should reject adding items to a published release", async () => {
    const payload = makePayload("published");
    const data = { release: "rel-1", targetCollection: "pages", targetDoc: "doc-1" };
    await expect(
      hook(makeArgs(data, payload) as any),
    ).rejects.toThrow(/can only be modified.*draft/i);
  });

  it("should reject duplicate doc in same release on create", async () => {
    const existing = [{ id: "item-99", targetCollection: "pages", targetDoc: "doc-1" }];
    const payload = makePayload("draft", existing);
    const data = {
      release: "rel-1",
      targetCollection: "pages",
      targetDoc: "doc-1",
    };
    await expect(
      hook(makeArgs(data, payload) as any),
    ).rejects.toThrow(/already exists in this release/i);
  });

  it("should allow updates to existing items in draft releases", async () => {
    const payload = makePayload("draft", []);
    const data = {
      release: "rel-1",
      targetCollection: "pages",
      targetDoc: "doc-1",
      snapshot: { title: "Updated" },
    };
    const result = await hook(
      makeArgs(data, payload, "update", { id: "item-1" }) as any,
    );
    expect(result.snapshot.title).toBe("Updated");
  });
});
```

**Step 2: Run test to verify it fails**

Run: `cd packages/payload-plugin-content-releases && bunx vitest run src/__tests__/hooks/releaseItemsBeforeChange.test.ts`
Expected: FAIL

**Step 3: Implement**

```typescript
// src/hooks/releaseItemsBeforeChange.ts
import type { CollectionBeforeChangeHook } from "payload";
import { RELEASES_SLUG, RELEASE_ITEMS_SLUG } from "../constants";

export function buildReleaseItemsBeforeChange(): CollectionBeforeChangeHook {
  return async ({ data, originalDoc, operation, req }) => {
    const releaseId = data.release as string;
    if (!releaseId) return data;

    // Check release status — items can only be modified when release is in draft
    const release = await req.payload.findByID({
      collection: RELEASES_SLUG,
      id: releaseId,
    });

    if ((release as any).status !== "draft") {
      throw new Error(
        `Release items can only be modified when the release is in "draft" status. Current status: "${(release as any).status}"`,
      );
    }

    // On create, check uniqueness: one document per release
    if (operation === "create") {
      const existing = await req.payload.find({
        collection: RELEASE_ITEMS_SLUG,
        where: {
          and: [
            { release: { equals: releaseId } },
            { targetCollection: { equals: data.targetCollection } },
            { targetDoc: { equals: data.targetDoc } },
          ],
        },
        limit: 1,
      });

      if (existing.docs.length > 0) {
        throw new Error(
          `Document "${data.targetDoc}" (${data.targetCollection}) already exists in this release. Update the existing item instead.`,
        );
      }
    }

    return data;
  };
}
```

**Step 4: Run test to verify it passes**

Run: `cd packages/payload-plugin-content-releases && bunx vitest run src/__tests__/hooks/releaseItemsBeforeChange.test.ts`
Expected: PASS (all 5 tests)

**Step 5: Commit**

```bash
git add packages/payload-plugin-content-releases/src/hooks/releaseItemsBeforeChange.ts
git add packages/payload-plugin-content-releases/src/__tests__/hooks/releaseItemsBeforeChange.test.ts
git commit -m "feat(content-releases): add release-items beforeChange hook with draft-only and uniqueness checks"
```

---

### Task 11: Wire hooks into collections and update plugin

**Files:**
- Modify: `packages/payload-plugin-content-releases/src/collections/releases.ts`
- Modify: `packages/payload-plugin-content-releases/src/collections/releaseItems.ts`
- Modify: `packages/payload-plugin-content-releases/src/plugin.ts`

**Step 1: Update releases collection to accept hooks**

Add `hooks` parameter to `buildReleasesCollection` and attach `releasesBeforeChange`.

**Step 2: Update releaseItems collection to accept hooks**

Add `hooks` parameter to `buildReleaseItemsCollection` and attach `buildReleaseItemsBeforeChange`.

**Step 3: Update plugin.ts to pass hooks**

```typescript
// In plugin.ts, update collection creation:
import { releasesBeforeChange } from "./hooks/releasesBeforeChange";
import { buildReleaseItemsBeforeChange } from "./hooks/releaseItemsBeforeChange";

// Inside the plugin function:
const releasesCollection = buildReleasesCollection({
  access: access?.releases,
  hooks: {
    beforeChange: [releasesBeforeChange],
  },
});

const releaseItemsCollection = buildReleaseItemsCollection(
  enabledCollections,
  {
    access: access?.releaseItems,
    hooks: {
      beforeChange: [buildReleaseItemsBeforeChange()],
    },
  },
);
```

**Step 4: Run all tests**

Run: `cd packages/payload-plugin-content-releases && bunx vitest run`
Expected: All tests pass

**Step 5: Build**

Run: `bunx turbo run build --filter=@focus-reactive/payload-plugin-content-releases`
Expected: Build succeeds

**Step 6: Commit**

```bash
git add packages/payload-plugin-content-releases/src/
git commit -m "feat(content-releases): wire lifecycle hooks into collections"
```

---

## Phase 3: Publish Engine

### Task 12: Implement conflict detection logic

**Files:**
- Create: `packages/payload-plugin-content-releases/src/publish/detectConflicts.ts`
- Create: `packages/payload-plugin-content-releases/src/__tests__/publish/detectConflicts.test.ts`

**Step 1: Write the failing test**

```typescript
// src/__tests__/publish/detectConflicts.test.ts
import { describe, it, expect, vi } from "vitest";
import { detectConflicts } from "../../publish/detectConflicts";

function makePayload(docs: Record<string, any>) {
  return {
    findByID: vi.fn().mockImplementation(({ collection, id }) => {
      const key = `${collection}:${id}`;
      if (docs[key]) return Promise.resolve(docs[key]);
      return Promise.reject(new Error("Not found"));
    }),
  };
}

describe("detectConflicts", () => {
  it("should return no conflicts when baseVersion matches", async () => {
    const payload = makePayload({
      "pages:doc-1": { id: "doc-1", updatedAt: "2026-01-01T00:00:00Z" },
    });
    const items = [
      {
        id: "item-1",
        targetCollection: "pages",
        targetDoc: "doc-1",
        baseVersion: "2026-01-01T00:00:00Z",
        action: "publish",
      },
    ];
    const result = await detectConflicts(items as any, payload as any);
    expect(result).toHaveLength(0);
  });

  it("should detect conflict when baseVersion differs", async () => {
    const payload = makePayload({
      "pages:doc-1": { id: "doc-1", updatedAt: "2026-01-02T00:00:00Z" },
    });
    const items = [
      {
        id: "item-1",
        targetCollection: "pages",
        targetDoc: "doc-1",
        baseVersion: "2026-01-01T00:00:00Z",
        action: "publish",
      },
    ];
    const result = await detectConflicts(items as any, payload as any);
    expect(result).toHaveLength(1);
    expect(result[0]!.itemId).toBe("item-1");
  });

  it("should detect conflict when document is missing", async () => {
    const payload = makePayload({});
    const items = [
      {
        id: "item-1",
        targetCollection: "pages",
        targetDoc: "doc-1",
        baseVersion: "2026-01-01T00:00:00Z",
        action: "publish",
      },
    ];
    const result = await detectConflicts(items as any, payload as any);
    expect(result).toHaveLength(1);
    expect(result[0]!.reason).toContain("not found");
  });

  it("should skip conflict check for items without baseVersion", async () => {
    const payload = makePayload({
      "pages:doc-1": { id: "doc-1", updatedAt: "2026-01-02T00:00:00Z" },
    });
    const items = [
      {
        id: "item-1",
        targetCollection: "pages",
        targetDoc: "doc-1",
        baseVersion: null,
        action: "publish",
      },
    ];
    const result = await detectConflicts(items as any, payload as any);
    expect(result).toHaveLength(0);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `cd packages/payload-plugin-content-releases && bunx vitest run src/__tests__/publish/detectConflicts.test.ts`
Expected: FAIL

**Step 3: Implement**

```typescript
// src/publish/detectConflicts.ts
import type { Payload } from "payload";

export interface ConflictResult {
  itemId: string;
  collection: string;
  docId: string;
  reason: string;
}

interface ReleaseItemForConflict {
  id: string;
  targetCollection: string;
  targetDoc: string;
  baseVersion: string | null;
  action: string;
}

export async function detectConflicts(
  items: ReleaseItemForConflict[],
  payload: Payload,
): Promise<ConflictResult[]> {
  const conflicts: ConflictResult[] = [];

  for (const item of items) {
    if (!item.baseVersion) continue;

    try {
      const doc = await payload.findByID({
        collection: item.targetCollection as any,
        id: item.targetDoc,
      });

      if ((doc as any).updatedAt !== item.baseVersion) {
        conflicts.push({
          itemId: item.id,
          collection: item.targetCollection,
          docId: item.targetDoc,
          reason: `Document was modified since staging. Expected version: ${item.baseVersion}, current: ${(doc as any).updatedAt}`,
        });
      }
    } catch {
      conflicts.push({
        itemId: item.id,
        collection: item.targetCollection,
        docId: item.targetDoc,
        reason: `Document not found in "${item.targetCollection}" collection`,
      });
    }
  }

  return conflicts;
}
```

**Step 4: Run test to verify it passes**

Run: `cd packages/payload-plugin-content-releases && bunx vitest run src/__tests__/publish/detectConflicts.test.ts`
Expected: PASS (all 4 tests)

**Step 5: Commit**

```bash
git add packages/payload-plugin-content-releases/src/publish/
git add packages/payload-plugin-content-releases/src/__tests__/publish/
git commit -m "feat(content-releases): add conflict detection for release items"
```

---

### Task 13: Implement the publish executor

**Files:**
- Create: `packages/payload-plugin-content-releases/src/publish/executePublish.ts`
- Create: `packages/payload-plugin-content-releases/src/__tests__/publish/executePublish.test.ts`

**Step 1: Write the failing test**

```typescript
// src/__tests__/publish/executePublish.test.ts
import { describe, it, expect, vi } from "vitest";
import { executePublish } from "../../publish/executePublish";
import type { ConflictStrategy } from "../../types";

function makePayload({
  findResult = { docs: [] },
  findByIdResult = {},
  updateResult = {},
  deleteResult = {},
} = {}) {
  return {
    find: vi.fn().mockResolvedValue(findResult),
    findByID: vi.fn().mockResolvedValue(findByIdResult),
    update: vi.fn().mockResolvedValue(updateResult),
    delete: vi.fn().mockResolvedValue(deleteResult),
  };
}

function makeItems(overrides: any[] = []) {
  return overrides.map((o, i) => ({
    id: `item-${i}`,
    targetCollection: "pages",
    targetDoc: `doc-${i}`,
    action: "publish",
    status: "pending",
    baseVersion: null,
    snapshot: { title: `Page ${i}`, _status: "published" },
    ...o,
  }));
}

describe("executePublish", () => {
  it("should publish all items by calling payload.update", async () => {
    const payload = makePayload({
      findByIdResult: { id: "doc-0", updatedAt: "2026-01-01" },
    });
    const items = makeItems([{ targetDoc: "doc-0" }]);

    const result = await executePublish({
      items: items as any,
      payload: payload as any,
      conflictStrategy: "fail",
      batchSize: 20,
    });

    expect(payload.update).toHaveBeenCalledWith(
      expect.objectContaining({
        collection: "pages",
        id: "doc-0",
        data: expect.objectContaining({ title: "Page 0" }),
      }),
    );
    expect(result.published).toHaveLength(1);
    expect(result.failed).toHaveLength(0);
  });

  it("should capture rollback snapshot before publishing", async () => {
    const originalDoc = { id: "doc-0", title: "Original", updatedAt: "2026-01-01" };
    const payload = makePayload({ findByIdResult: originalDoc });
    const items = makeItems([{ targetDoc: "doc-0" }]);

    const result = await executePublish({
      items: items as any,
      payload: payload as any,
      conflictStrategy: "fail",
      batchSize: 20,
    });

    expect(result.rollbackSnapshot).toHaveLength(1);
    expect(result.rollbackSnapshot[0]!.previousState).toEqual(originalDoc);
  });

  it("should handle unpublish action by setting _status to draft", async () => {
    const payload = makePayload({
      findByIdResult: { id: "doc-0", _status: "published", updatedAt: "2026-01-01" },
    });
    const items = makeItems([{ targetDoc: "doc-0", action: "unpublish" }]);

    await executePublish({
      items: items as any,
      payload: payload as any,
      conflictStrategy: "fail",
      batchSize: 20,
    });

    expect(payload.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ _status: "draft" }),
      }),
    );
  });

  it("should skip items with conflicts when strategy is fail", async () => {
    const payload = makePayload({
      findByIdResult: { id: "doc-0", updatedAt: "2026-01-02T00:00:00Z" },
    });
    const items = makeItems([
      { targetDoc: "doc-0", baseVersion: "2026-01-01T00:00:00Z" },
    ]);

    const result = await executePublish({
      items: items as any,
      payload: payload as any,
      conflictStrategy: "fail",
      batchSize: 20,
    });

    expect(result.failed).toHaveLength(1);
    expect(result.published).toHaveLength(0);
  });

  it("should force-publish items with conflicts when strategy is force", async () => {
    const payload = makePayload({
      findByIdResult: { id: "doc-0", updatedAt: "2026-01-02T00:00:00Z" },
    });
    const items = makeItems([
      { targetDoc: "doc-0", baseVersion: "2026-01-01T00:00:00Z" },
    ]);

    const result = await executePublish({
      items: items as any,
      payload: payload as any,
      conflictStrategy: "force",
      batchSize: 20,
    });

    expect(result.published).toHaveLength(1);
  });

  it("should record errors for failed updates", async () => {
    const payload = makePayload({
      findByIdResult: { id: "doc-0", updatedAt: "2026-01-01" },
    });
    payload.update.mockRejectedValue(new Error("DB write failed"));
    const items = makeItems([{ targetDoc: "doc-0" }]);

    const result = await executePublish({
      items: items as any,
      payload: payload as any,
      conflictStrategy: "fail",
      batchSize: 20,
    });

    expect(result.failed).toHaveLength(1);
    expect(result.failed[0]!.error).toContain("DB write failed");
  });
});
```

**Step 2: Run test to verify it fails**

Run: `cd packages/payload-plugin-content-releases && bunx vitest run src/__tests__/publish/executePublish.test.ts`
Expected: FAIL

**Step 3: Implement the executor**

```typescript
// src/publish/executePublish.ts
import type { Payload } from "payload";
import type { ConflictStrategy } from "../types";

interface ReleaseItemForPublish {
  id: string;
  targetCollection: string;
  targetDoc: string;
  action: string;
  snapshot: Record<string, any>;
  baseVersion: string | null;
}

interface RollbackEntry {
  collection: string;
  docId: string;
  action: string;
  previousState: Record<string, any> | null;
}

interface PublishResult {
  published: Array<{ itemId: string; collection: string; docId: string }>;
  failed: Array<{ itemId: string; collection: string; docId: string; error: string }>;
  rollbackSnapshot: RollbackEntry[];
}

interface ExecutePublishOptions {
  items: ReleaseItemForPublish[];
  payload: Payload;
  conflictStrategy: ConflictStrategy;
  batchSize: number;
}

export async function executePublish(
  options: ExecutePublishOptions,
): Promise<PublishResult> {
  const { items, payload, conflictStrategy, batchSize } = options;

  const published: PublishResult["published"] = [];
  const failed: PublishResult["failed"] = [];
  const rollbackSnapshot: RollbackEntry[] = [];

  // Process in batches
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);

    for (const item of batch) {
      try {
        // Fetch current document state for rollback + conflict check
        const currentDoc = await payload.findByID({
          collection: item.targetCollection as any,
          id: item.targetDoc,
        });

        // Conflict detection
        if (
          item.baseVersion &&
          (currentDoc as any).updatedAt !== item.baseVersion
        ) {
          if (conflictStrategy === "fail") {
            failed.push({
              itemId: item.id,
              collection: item.targetCollection,
              docId: item.targetDoc,
              error: `Conflict: document modified since staging (expected ${item.baseVersion}, got ${(currentDoc as any).updatedAt})`,
            });
            continue;
          }
          // strategy === "force": proceed anyway
        }

        // Save rollback state
        rollbackSnapshot.push({
          collection: item.targetCollection,
          docId: item.targetDoc,
          action: item.action,
          previousState: currentDoc as Record<string, any>,
        });

        // Execute the action
        if (item.action === "unpublish") {
          await payload.update({
            collection: item.targetCollection as any,
            id: item.targetDoc,
            data: { _status: "draft" } as any,
          });
        } else {
          // publish: apply snapshot
          await payload.update({
            collection: item.targetCollection as any,
            id: item.targetDoc,
            data: item.snapshot as any,
          });
        }

        published.push({
          itemId: item.id,
          collection: item.targetCollection,
          docId: item.targetDoc,
        });
      } catch (err) {
        failed.push({
          itemId: item.id,
          collection: item.targetCollection,
          docId: item.targetDoc,
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }
  }

  return { published, failed, rollbackSnapshot };
}
```

**Step 4: Run test to verify it passes**

Run: `cd packages/payload-plugin-content-releases && bunx vitest run src/__tests__/publish/executePublish.test.ts`
Expected: PASS (all 6 tests)

**Step 5: Commit**

```bash
git add packages/payload-plugin-content-releases/src/publish/executePublish.ts
git add packages/payload-plugin-content-releases/src/__tests__/publish/executePublish.test.ts
git commit -m "feat(content-releases): implement publish executor with conflict handling and rollback snapshots"
```

---

## Phase 4: REST API Endpoints

### Task 14: Implement the publish release endpoint

**Files:**
- Create: `packages/payload-plugin-content-releases/src/endpoints/publishRelease.ts`
- Create: `packages/payload-plugin-content-releases/src/__tests__/endpoints/publishRelease.test.ts`

**Step 1: Write the failing test**

```typescript
// src/__tests__/endpoints/publishRelease.test.ts
import { describe, it, expect, vi } from "vitest";
import { createPublishReleaseHandler } from "../../endpoints/publishRelease";

function makeReq({
  releaseId = "rel-1",
  releaseData = { status: "draft", name: "Test" },
  releaseItems = [] as any[],
  updateResult = {},
} = {}) {
  return {
    routeParams: { id: releaseId },
    payload: {
      findByID: vi.fn().mockResolvedValue(releaseData),
      find: vi.fn().mockResolvedValue({ docs: releaseItems }),
      update: vi.fn().mockResolvedValue(updateResult),
    },
  };
}

describe("publishRelease handler", () => {
  const handler = createPublishReleaseHandler({
    conflictStrategy: "fail",
    publishBatchSize: 20,
  });

  it("should reject publishing a non-draft release", async () => {
    const req = makeReq({ releaseData: { status: "published", name: "Test" } });
    const response = await handler(req as any);
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toContain("draft");
  });

  it("should reject publishing an empty release", async () => {
    const req = makeReq({ releaseItems: [] });
    const response = await handler(req as any);
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toContain("no items");
  });

  it("should return 200 on successful publish", async () => {
    const items = [
      {
        id: "item-1",
        targetCollection: "pages",
        targetDoc: "doc-1",
        action: "publish",
        status: "pending",
        baseVersion: null,
        snapshot: { title: "Hello", _status: "published" },
      },
    ];
    const req = makeReq({ releaseItems: items });
    // Make findByID return the release first, then the doc
    req.payload.findByID
      .mockResolvedValueOnce({ status: "draft", name: "Test" }) // release
      .mockResolvedValue({ id: "doc-1", updatedAt: "2026-01-01" }); // doc

    const response = await handler(req as any);
    expect(response.status).toBe(200);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `cd packages/payload-plugin-content-releases && bunx vitest run src/__tests__/endpoints/publishRelease.test.ts`
Expected: FAIL

**Step 3: Implement**

```typescript
// src/endpoints/publishRelease.ts
import type { PayloadHandler } from "payload";
import type { ConflictStrategy } from "../types";
import { RELEASES_SLUG, RELEASE_ITEMS_SLUG } from "../constants";
import { executePublish } from "../publish/executePublish";

interface PublishReleaseConfig {
  conflictStrategy: ConflictStrategy;
  publishBatchSize: number;
  hooks?: {
    afterPublish?: (args: { releaseId: string; req: any }) => void | Promise<void>;
    onPublishError?: (args: { releaseId: string; errors: any[]; req: any }) => void | Promise<void>;
  };
}

export function createPublishReleaseHandler(
  config: PublishReleaseConfig,
): PayloadHandler {
  return async (req) => {
    const releaseId = (req.routeParams as any)?.id as string;
    if (!releaseId) {
      return Response.json({ error: "Missing release ID" }, { status: 400 });
    }

    try {
      // Fetch release
      const release = await req.payload.findByID({
        collection: RELEASES_SLUG as any,
        id: releaseId,
      });

      if ((release as any).status !== "draft") {
        return Response.json(
          { error: `Release can only be published from "draft" status. Current: "${(release as any).status}"` },
          { status: 400 },
        );
      }

      // Fetch items
      const { docs: items } = await req.payload.find({
        collection: RELEASE_ITEMS_SLUG as any,
        where: { release: { equals: releaseId } },
        limit: 0, // all items
      });

      if (items.length === 0) {
        return Response.json(
          { error: "Release has no items to publish" },
          { status: 400 },
        );
      }

      // Set status to publishing
      await req.payload.update({
        collection: RELEASES_SLUG as any,
        id: releaseId,
        data: { status: "publishing" } as any,
      });

      // Execute
      const result = await executePublish({
        items: items as any,
        payload: req.payload,
        conflictStrategy: config.conflictStrategy,
        batchSize: config.publishBatchSize,
      });

      // Update item statuses
      for (const p of result.published) {
        await req.payload.update({
          collection: RELEASE_ITEMS_SLUG as any,
          id: p.itemId,
          data: { status: "published" } as any,
        });
      }
      for (const f of result.failed) {
        await req.payload.update({
          collection: RELEASE_ITEMS_SLUG as any,
          id: f.itemId,
          data: { status: "failed" } as any,
        });
      }

      // Determine final release status
      const hasFailures = result.failed.length > 0;
      const finalStatus = hasFailures ? "failed" : "published";

      await req.payload.update({
        collection: RELEASES_SLUG as any,
        id: releaseId,
        data: {
          status: finalStatus,
          ...(hasFailures
            ? { errorLog: result.failed }
            : { publishedAt: new Date().toISOString() }),
          rollbackSnapshot: result.rollbackSnapshot,
        } as any,
      });

      // Call lifecycle hooks
      if (hasFailures && config.hooks?.onPublishError) {
        await config.hooks.onPublishError({
          releaseId,
          errors: result.failed,
          req,
        });
      } else if (!hasFailures && config.hooks?.afterPublish) {
        await config.hooks.afterPublish({ releaseId, req });
      }

      return Response.json({
        ok: true,
        status: finalStatus,
        published: result.published.length,
        failed: result.failed.length,
        errors: hasFailures ? result.failed : undefined,
      });
    } catch (err) {
      return Response.json(
        { error: err instanceof Error ? err.message : "Internal server error" },
        { status: 500 },
      );
    }
  };
}
```

**Step 4: Run test to verify it passes**

Run: `cd packages/payload-plugin-content-releases && bunx vitest run src/__tests__/endpoints/publishRelease.test.ts`
Expected: PASS (all 3 tests)

**Step 5: Commit**

```bash
git add packages/payload-plugin-content-releases/src/endpoints/
git add packages/payload-plugin-content-releases/src/__tests__/endpoints/
git commit -m "feat(content-releases): add publish release REST endpoint"
```

---

### Task 15: Implement conflicts check endpoint

**Files:**
- Create: `packages/payload-plugin-content-releases/src/endpoints/checkConflicts.ts`
- Create: `packages/payload-plugin-content-releases/src/__tests__/endpoints/checkConflicts.test.ts`

**Step 1: Write the failing test**

```typescript
// src/__tests__/endpoints/checkConflicts.test.ts
import { describe, it, expect, vi } from "vitest";
import { createCheckConflictsHandler } from "../../endpoints/checkConflicts";

describe("checkConflicts handler", () => {
  const handler = createCheckConflictsHandler();

  it("should return empty conflicts for items with matching versions", async () => {
    const req = {
      routeParams: { id: "rel-1" },
      payload: {
        find: vi.fn().mockResolvedValue({
          docs: [
            {
              id: "item-1",
              targetCollection: "pages",
              targetDoc: "doc-1",
              baseVersion: "2026-01-01T00:00:00Z",
              action: "publish",
            },
          ],
        }),
        findByID: vi.fn().mockResolvedValue({
          id: "doc-1",
          updatedAt: "2026-01-01T00:00:00Z",
        }),
      },
    };

    const response = await handler(req as any);
    const body = await response.json();
    expect(body.conflicts).toHaveLength(0);
  });

  it("should return conflicts for modified documents", async () => {
    const req = {
      routeParams: { id: "rel-1" },
      payload: {
        find: vi.fn().mockResolvedValue({
          docs: [
            {
              id: "item-1",
              targetCollection: "pages",
              targetDoc: "doc-1",
              baseVersion: "2026-01-01T00:00:00Z",
              action: "publish",
            },
          ],
        }),
        findByID: vi.fn().mockResolvedValue({
          id: "doc-1",
          updatedAt: "2026-01-02T00:00:00Z",
        }),
      },
    };

    const response = await handler(req as any);
    const body = await response.json();
    expect(body.conflicts).toHaveLength(1);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `cd packages/payload-plugin-content-releases && bunx vitest run src/__tests__/endpoints/checkConflicts.test.ts`
Expected: FAIL

**Step 3: Implement**

```typescript
// src/endpoints/checkConflicts.ts
import type { PayloadHandler } from "payload";
import { RELEASE_ITEMS_SLUG } from "../constants";
import { detectConflicts } from "../publish/detectConflicts";

export function createCheckConflictsHandler(): PayloadHandler {
  return async (req) => {
    const releaseId = (req.routeParams as any)?.id as string;
    if (!releaseId) {
      return Response.json({ error: "Missing release ID" }, { status: 400 });
    }

    const { docs: items } = await req.payload.find({
      collection: RELEASE_ITEMS_SLUG as any,
      where: { release: { equals: releaseId } },
      limit: 0,
    });

    const conflicts = await detectConflicts(items as any, req.payload);

    return Response.json({ conflicts, total: items.length });
  };
}
```

**Step 4: Run test to verify it passes**

Run: `cd packages/payload-plugin-content-releases && bunx vitest run src/__tests__/endpoints/checkConflicts.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add packages/payload-plugin-content-releases/src/endpoints/checkConflicts.ts
git add packages/payload-plugin-content-releases/src/__tests__/endpoints/checkConflicts.test.ts
git commit -m "feat(content-releases): add conflicts check endpoint"
```

---

### Task 16: Register endpoints in the plugin

**Files:**
- Modify: `packages/payload-plugin-content-releases/src/plugin.ts`
- Create: `packages/payload-plugin-content-releases/src/__tests__/plugin-endpoints.test.ts`

**Step 1: Write the failing test**

```typescript
// src/__tests__/plugin-endpoints.test.ts
import { describe, it, expect } from "vitest";
import { contentReleasesPlugin } from "../plugin";
import type { Config } from "payload";

function makeBaseConfig(): Config {
  return {
    collections: [{ slug: "pages", fields: [] }],
    globals: [],
  } as Config;
}

describe("plugin endpoints", () => {
  it("should register publish endpoint", () => {
    const plugin = contentReleasesPlugin({ enabledCollections: ["pages"] });
    const config = plugin(makeBaseConfig());
    const endpoint = config.endpoints?.find(
      (e: any) => e.path === "/content-releases/:id/publish",
    );
    expect(endpoint).toBeDefined();
    expect(endpoint?.method).toBe("post");
  });

  it("should register conflicts endpoint", () => {
    const plugin = contentReleasesPlugin({ enabledCollections: ["pages"] });
    const config = plugin(makeBaseConfig());
    const endpoint = config.endpoints?.find(
      (e: any) => e.path === "/content-releases/:id/conflicts",
    );
    expect(endpoint).toBeDefined();
    expect(endpoint?.method).toBe("get");
  });
});
```

**Step 2: Run test to verify it fails**

Run: `cd packages/payload-plugin-content-releases && bunx vitest run src/__tests__/plugin-endpoints.test.ts`
Expected: FAIL

**Step 3: Update plugin.ts to register endpoints**

```typescript
// Add to plugin.ts:
import { createPublishReleaseHandler } from "./endpoints/publishRelease";
import { createCheckConflictsHandler } from "./endpoints/checkConflicts";
import {
  DEFAULT_CONFLICT_STRATEGY,
  DEFAULT_PUBLISH_BATCH_SIZE,
} from "./constants";

// Inside the returned config:
return {
  ...config,
  collections: [
    ...(config.collections ?? []),
    releasesCollection,
    releaseItemsCollection,
  ],
  endpoints: [
    ...(config.endpoints ?? []),
    {
      path: "/content-releases/:id/publish",
      method: "post",
      handler: createPublishReleaseHandler({
        conflictStrategy: options.conflictStrategy ?? DEFAULT_CONFLICT_STRATEGY,
        publishBatchSize: options.publishBatchSize ?? DEFAULT_PUBLISH_BATCH_SIZE,
        hooks: options.hooks,
      }),
    },
    {
      path: "/content-releases/:id/conflicts",
      method: "get",
      handler: createCheckConflictsHandler(),
    },
  ],
};
```

**Step 4: Run test to verify it passes**

Run: `cd packages/payload-plugin-content-releases && bunx vitest run src/__tests__/plugin-endpoints.test.ts`
Expected: PASS

**Step 5: Run all tests**

Run: `cd packages/payload-plugin-content-releases && bunx vitest run`
Expected: All tests pass

**Step 6: Build**

Run: `bunx turbo run build --filter=@focus-reactive/payload-plugin-content-releases`
Expected: Build succeeds

**Step 7: Commit**

```bash
git add packages/payload-plugin-content-releases/src/
git add packages/payload-plugin-content-releases/src/__tests__/
git commit -m "feat(content-releases): register publish and conflicts endpoints in plugin"
```

---

## Phase 5: Dev App Integration

### Task 17: Integrate plugin into the dev app

**Files:**
- Modify: `apps/dev/package.json` — add `"@focus-reactive/payload-plugin-content-releases": "workspace:*"`
- Modify: `apps/dev/src/payload.config.ts` — add plugin to plugins array
- Modify: `apps/dev/src/collections/Pages.ts` — enable versions/drafts if not already

**Step 1: Add workspace dependency to dev app**

Add to `apps/dev/package.json` dependencies:
```json
"@focus-reactive/payload-plugin-content-releases": "workspace:*"
```

**Step 2: Update payload.config.ts**

```typescript
import { contentReleasesPlugin } from "@focus-reactive/payload-plugin-content-releases";

// In plugins array:
contentReleasesPlugin({
  enabledCollections: ["pages"],
}),
```

**Step 3: Ensure Pages has versions/drafts enabled**

If not already present, add to Pages collection config:
```typescript
versions: {
  drafts: true,
},
```

**Step 4: Install and build**

Run: `cd /Users/pashahurs/Projects/payload-plugins && bun install && bun run build`
Expected: All packages build successfully

**Step 5: Start dev and verify**

Run: `cd /Users/pashahurs/Projects/payload-plugins && bun run dev`
Expected: Dev server starts. Navigate to admin panel and see "Releases" and "Release Items" in the sidebar.

**Step 6: Commit**

```bash
git add apps/dev/package.json apps/dev/src/payload.config.ts apps/dev/src/collections/Pages.ts
git commit -m "feat(dev): integrate content-releases plugin into dev app"
```

---

## Phase 6: Scheduled Release Publishing (Optional Integration)

### Task 18: Add scheduled release cron check

**Files:**
- Create: `packages/payload-plugin-content-releases/src/endpoints/runScheduled.ts`
- Create: `packages/payload-plugin-content-releases/src/__tests__/endpoints/runScheduled.test.ts`
- Modify: `packages/payload-plugin-content-releases/src/types.ts` — add optional `schedulerSecret`
- Modify: `packages/payload-plugin-content-releases/src/plugin.ts` — register endpoint

**Step 1: Write the failing test**

```typescript
// src/__tests__/endpoints/runScheduled.test.ts
import { describe, it, expect, vi } from "vitest";
import { createRunScheduledHandler } from "../../endpoints/runScheduled";

describe("runScheduled handler", () => {
  const handler = createRunScheduledHandler({
    secret: "test-secret",
    conflictStrategy: "fail",
    publishBatchSize: 20,
  });

  it("should reject unauthorized requests", async () => {
    const req = {
      headers: { get: () => null },
      payload: {},
    };
    const response = await handler(req as any);
    expect(response.status).toBe(401);
  });

  it("should reject wrong bearer token", async () => {
    const req = {
      headers: { get: () => "Bearer wrong-token" },
      payload: {},
    };
    const response = await handler(req as any);
    expect(response.status).toBe(401);
  });

  it("should process due scheduled releases", async () => {
    const dueRelease = {
      id: "rel-1",
      name: "Test Release",
      status: "scheduled",
      scheduledAt: new Date(Date.now() - 60000).toISOString(), // 1 minute ago
    };
    const req = {
      headers: { get: () => "Bearer test-secret" },
      payload: {
        find: vi.fn()
          .mockResolvedValueOnce({ docs: [dueRelease] }) // scheduled releases
          .mockResolvedValueOnce({ docs: [] }), // release items (empty = skip)
        findByID: vi.fn().mockResolvedValue(dueRelease),
        update: vi.fn().mockResolvedValue({}),
      },
    };

    const response = await handler(req as any);
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.ok).toBe(true);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `cd packages/payload-plugin-content-releases && bunx vitest run src/__tests__/endpoints/runScheduled.test.ts`
Expected: FAIL

**Step 3: Implement**

```typescript
// src/endpoints/runScheduled.ts
import type { PayloadHandler } from "payload";
import type { ConflictStrategy } from "../types";
import { RELEASES_SLUG, RELEASE_ITEMS_SLUG } from "../constants";
import { executePublish } from "../publish/executePublish";

interface RunScheduledConfig {
  secret: string;
  conflictStrategy: ConflictStrategy;
  publishBatchSize: number;
}

export function createRunScheduledHandler(
  config: RunScheduledConfig,
): PayloadHandler {
  return async (req) => {
    const auth = req.headers.get("authorization");
    if (!config.secret || auth !== `Bearer ${config.secret}`) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Find all scheduled releases that are due
    const now = new Date().toISOString();
    const { docs: dueReleases } = await req.payload.find({
      collection: RELEASES_SLUG as any,
      where: {
        and: [
          { status: { equals: "scheduled" } },
          { scheduledAt: { less_than_equal: now } },
        ],
      },
      limit: 0,
    });

    const results: Array<{ releaseId: string; status: string; published: number; failed: number }> = [];

    for (const release of dueReleases) {
      const { docs: items } = await req.payload.find({
        collection: RELEASE_ITEMS_SLUG as any,
        where: { release: { equals: (release as any).id } },
        limit: 0,
      });

      if (items.length === 0) {
        await req.payload.update({
          collection: RELEASES_SLUG as any,
          id: (release as any).id,
          data: { status: "failed", errorLog: [{ error: "No items in release" }] } as any,
        });
        results.push({ releaseId: (release as any).id, status: "failed", published: 0, failed: 0 });
        continue;
      }

      // Set to publishing
      await req.payload.update({
        collection: RELEASES_SLUG as any,
        id: (release as any).id,
        data: { status: "publishing" } as any,
      });

      const result = await executePublish({
        items: items as any,
        payload: req.payload,
        conflictStrategy: config.conflictStrategy,
        batchSize: config.publishBatchSize,
      });

      const hasFailures = result.failed.length > 0;
      const finalStatus = hasFailures ? "failed" : "published";

      await req.payload.update({
        collection: RELEASES_SLUG as any,
        id: (release as any).id,
        data: {
          status: finalStatus,
          ...(hasFailures
            ? { errorLog: result.failed }
            : { publishedAt: new Date().toISOString() }),
          rollbackSnapshot: result.rollbackSnapshot,
        } as any,
      });

      results.push({
        releaseId: (release as any).id,
        status: finalStatus,
        published: result.published.length,
        failed: result.failed.length,
      });
    }

    return Response.json({ ok: true, processed: results.length, results });
  };
}
```

**Step 4: Update types to add schedulerSecret**

Add to `ContentReleasesPluginConfig`:
```typescript
/** Bearer token to authenticate the /content-releases/run-scheduled endpoint.
 * Required to enable scheduled release publishing.
 */
schedulerSecret?: string;
```

**Step 5: Register endpoint in plugin.ts (only when schedulerSecret is provided)**

```typescript
// In plugin.ts, conditionally add endpoint:
if (options.schedulerSecret) {
  endpoints.push({
    path: "/content-releases/run-scheduled",
    method: "get",
    handler: createRunScheduledHandler({
      secret: options.schedulerSecret,
      conflictStrategy: options.conflictStrategy ?? DEFAULT_CONFLICT_STRATEGY,
      publishBatchSize: options.publishBatchSize ?? DEFAULT_PUBLISH_BATCH_SIZE,
    }),
  });
}
```

**Step 6: Run all tests**

Run: `cd packages/payload-plugin-content-releases && bunx vitest run`
Expected: All tests pass

**Step 7: Build**

Run: `bunx turbo run build --filter=@focus-reactive/payload-plugin-content-releases`
Expected: Build succeeds

**Step 8: Commit**

```bash
git add packages/payload-plugin-content-releases/src/
git commit -m "feat(content-releases): add scheduled release publishing endpoint with bearer auth"
```

---

## Phase 7: Final Verification & Polish

### Task 19: Run full test suite and verify build

**Step 1: Run all tests**

Run: `cd packages/payload-plugin-content-releases && bunx vitest run`
Expected: All tests pass (should be ~40+ tests across all test files)

**Step 2: Build the plugin**

Run: `bunx turbo run build --filter=@focus-reactive/payload-plugin-content-releases`
Expected: Clean build

**Step 3: Build entire monorepo**

Run: `cd /Users/pashahurs/Projects/payload-plugins && bun run build`
Expected: All packages build successfully

**Step 4: Lint**

Run: `cd packages/payload-plugin-content-releases && bun run lint`
Expected: No errors

---

### Task 20: Add README

**Files:**
- Create: `packages/payload-plugin-content-releases/README.md`

Write a concise README covering:
- What the plugin does
- Installation (`bun add @focus-reactive/payload-plugin-content-releases`)
- Basic config example
- Available endpoints
- Optional scheduled publishing setup
- Link to the releases and release-items collection schemas

**Commit:**
```bash
git add packages/payload-plugin-content-releases/README.md
git commit -m "docs(content-releases): add README"
```

---

## Summary of Test Coverage

| Test file | Tests | What it covers |
|-----------|-------|---------------|
| `types.test.ts` | 5 | Type correctness for config and domain types |
| `collections/releases.test.ts` | 9 | Releases collection fields, access config |
| `collections/releaseItems.test.ts` | 8 | Release-items collection fields, enabled collections |
| `plugin-integration.test.ts` | 6 | Plugin injects collections, preserves config, warns on bad slugs |
| `plugin-endpoints.test.ts` | 2 | Plugin registers endpoints |
| `validation/statusTransitions.test.ts` | ~17 | All valid/invalid state transitions |
| `hooks/releasesBeforeChange.test.ts` | 7 | Status enforcement, forced draft on create, publishedAt |
| `hooks/releaseItemsBeforeChange.test.ts` | 5 | Draft-only editing, uniqueness check |
| `publish/detectConflicts.test.ts` | 4 | Conflict detection by version comparison |
| `publish/executePublish.test.ts` | 6 | Publish flow, rollback capture, conflict strategies, error handling |
| `endpoints/publishRelease.test.ts` | 3 | Endpoint validation, success path |
| `endpoints/checkConflicts.test.ts` | 2 | Conflict check endpoint |
| `endpoints/runScheduled.test.ts` | 3 | Auth, scheduled release processing |
| **Total** | **~77** | |

## File Tree (Final State)

```
packages/payload-plugin-content-releases/
├── package.json
├── tsconfig.json
├── tsup.config.ts
├── vitest.config.ts
├── .gitignore
├── README.md
└── src/
    ├── index.ts
    ├── plugin.ts
    ├── types.ts
    ├── constants.ts
    ├── collections/
    │   ├── releases.ts
    │   └── releaseItems.ts
    ├── validation/
    │   └── statusTransitions.ts
    ├── hooks/
    │   ├── releasesBeforeChange.ts
    │   └── releaseItemsBeforeChange.ts
    ├── publish/
    │   ├── detectConflicts.ts
    │   └── executePublish.ts
    ├── endpoints/
    │   ├── publishRelease.ts
    │   ├── checkConflicts.ts
    │   └── runScheduled.ts
    └── __tests__/
        ├── setup.ts
        ├── plugin.test.ts
        ├── plugin-integration.test.ts
        ├── plugin-endpoints.test.ts
        ├── types.test.ts
        ├── collections/
        │   ├── releases.test.ts
        │   └── releaseItems.test.ts
        ├── validation/
        │   └── statusTransitions.test.ts
        ├── hooks/
        │   ├── releasesBeforeChange.test.ts
        │   └── releaseItemsBeforeChange.test.ts
        ├── publish/
        │   ├── detectConflicts.test.ts
        │   └── executePublish.test.ts
        └── endpoints/
            ├── publishRelease.test.ts
            ├── checkConflicts.test.ts
            └── runScheduled.test.ts
```
