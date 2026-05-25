import type { CollectionBeforeChangeHook } from "payload";

export const setAuthorBeforeCreate: CollectionBeforeChangeHook = async ({ data, req, operation }) => {
  if (operation === "create" && req.user && !data.author) {
    data.author = req.user.id;
  }

  return data;
};
