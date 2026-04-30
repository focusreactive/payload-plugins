import type { PayloadHandler } from "payload";
import { RELEASE_ITEMS_SLUG } from "../constants";

export function createRefreshItemSnapshotHandler(): PayloadHandler {
  return async (req) => {
    if (!req.user) {
      return Response.json(
        { error: "Authentication required" },
        { status: 401 },
      );
    }

    const itemId = (req.routeParams as any)?.itemId as string | undefined;
    if (!itemId) {
      return Response.json({ error: "Missing item ID" }, { status: 400 });
    }

    try {
      const item = (await req.payload.findByID({
        collection: RELEASE_ITEMS_SLUG as any,
        id: itemId,
      })) as unknown as {
        targetCollection: string;
        targetDoc: string;
      };

      if (!item) {
        return Response.json({ error: "Item not found" }, { status: 404 });
      }

      const currentDoc = (await req.payload.findByID({
        collection: item.targetCollection as any,
        id: item.targetDoc,
        draft: true,
      })) as Record<string, unknown> & { updatedAt?: string };

      const {
        id: _id,
        createdAt: _createdAt,
        updatedAt: _updatedAt,
        ...snapshot
      } = currentDoc;

      await req.payload.update({
        collection: RELEASE_ITEMS_SLUG as any,
        id: itemId,
        data: {
          snapshot,
          baseVersion: currentDoc.updatedAt ?? null,
          status: "pending",
        } as any,
        context: { contentReleasesBypass: true } as any,
      });

      return Response.json({ ok: true });
    } catch (err) {
      return Response.json(
        { error: err instanceof Error ? err.message : "Internal server error" },
        { status: 500 },
      );
    }
  };
}
