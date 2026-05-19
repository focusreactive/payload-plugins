import type { CollectionBeforeChangeHook } from "payload";

export const setUserBeforeCreate: CollectionBeforeChangeHook = async ({ data, req, operation }) => {
  if (operation === "create" && req.user && !data.user) {
    data.user = req.user.id;
  }

  return data;
};
