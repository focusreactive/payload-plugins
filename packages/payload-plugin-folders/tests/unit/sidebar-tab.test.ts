import type { Config } from "payload";
import { describe, expect, it } from "vitest";

import { foldersPlugin, pluginSlug } from "../../src/index.js";
import { en } from "../../src/translations/en.js";

const buildHostConfig = (admin?: Config["admin"]): Config =>
  ({
    admin,
    collections: [
      { slug: "pages", fields: [{ name: "title", type: "text" }] },
      { slug: "users", auth: true, fields: [] },
    ],
    secret: "unit",
  }) as unknown as Config;

const tabsOf = (config: Config) => config.admin?.components?.sidebar?.tabs;

describe("the sidebar tab", () => {
  it("is registered with the content on the server and a folder icon", async () => {
    const result = await foldersPlugin({ collections: { pages: true } as never })(
      buildHostConfig()
    );

    expect(tabsOf(result)).toEqual([
      {
        slug: "folders-tree",
        components: {
          Content: {
            path: `${pluginSlug}/rsc#SidebarTabServer`,
            serverProps: { foldersSlug: "folders" },
          },
          Icon: { clientProps: { color: "muted" }, path: "@payloadcms/ui#FolderIcon" },
        },
        label: expect.any(Function),
      },
    ]);
  });

  it("is not registered with admin.sidebarTab: false", async () => {
    const result = await foldersPlugin({
      admin: { sidebarTab: false },
      collections: { pages: true } as never,
    })(buildHostConfig());

    expect(tabsOf(result)).toBeUndefined();
  });

  it("is not registered when the plugin is disabled", async () => {
    const result = await foldersPlugin({ collections: { pages: true } as never, disabled: true })(
      buildHostConfig()
    );

    expect(tabsOf(result)).toBeUndefined();
  });

  it("keeps the host's own tabs, and goes after them", async () => {
    const hostTab = {
      slug: "host-tab",
      components: { Content: "host#Content", Icon: "host#Icon" },
    };
    const result = await foldersPlugin({ collections: { pages: true } as never })(
      buildHostConfig({ components: { sidebar: { tabs: [hostTab] } } } as never)
    );

    expect(tabsOf(result)?.map((tab) => tab.slug)).toEqual(["host-tab", "folders-tree"]);
  });

  it("does not add itself twice", async () => {
    const once = await foldersPlugin({ collections: { pages: true } as never })(buildHostConfig());
    const twice = await foldersPlugin({ collections: { pages: true } as never })(
      buildHostConfig(once.admin)
    );

    expect(tabsOf(twice)).toHaveLength(1);
  });

  it("has the translated word for its label by default, and the host's own word when set", async () => {
    const byDefault = await foldersPlugin({ collections: { pages: true } as never })(
      buildHostConfig()
    );
    const named = await foldersPlugin({
      admin: { sidebarTab: { label: "Pages" } },
      collections: { pages: true } as never,
    })(buildHostConfig());

    const label = tabsOf(byDefault)?.[0]?.label as (args: { t: (key: string) => string }) => string;
    expect(label({ t: (key) => `translated ${key}` })).toBe("translated foldersTree:sidebarTab");
    expect(en.foldersTree.sidebarTab).toBe("Tree");
    expect(tabsOf(named)?.[0]?.label).toBe("Pages");
  });
});
