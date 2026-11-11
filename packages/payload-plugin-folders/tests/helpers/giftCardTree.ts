import type { Payload } from "payload";

/**
 * The move from the agent trial: Products / Produkte holds a page Gift Cards, published in both
 * languages, and an empty folder Guides that has an English name only (German falls back to it).
 */
export type GiftCardTree = {
  giftCards: { id: number };
  guides: { id: number };
  products: { id: number };
};

type Row = { id: number };

const create = (
  payload: Payload,
  collection: "folders" | "pages" | "posts",
  data: Record<string, unknown>,
  extra: Record<string, unknown> = {}
) =>
  payload.create({
    collection,
    data: data as never,
    depth: 0,
    overrideAccess: true,
    ...extra,
  }) as unknown as Promise<Row>;

export const seedGiftCardTree = async (payload: Payload): Promise<GiftCardTree> => {
  const products = await create(
    payload,
    "folders",
    { name: { de: "Produkte", en: "Products" }, slug: { de: "produkte", en: "products" } },
    { locale: "all" }
  );
  const guides = await create(payload, "folders", {
    name: "Guides",
    parent: products.id,
    slug: "guides",
  });
  const giftCards = await create(
    payload,
    "pages",
    {
      _status: "published",
      folder: products.id,
      slug: { de: "gift-cards", en: "gift-cards" },
      title: { de: "Geschenkkarten", en: "Gift Cards" },
    },
    { locale: "all" }
  );

  return { giftCards, guides, products };
};
