export type QueryContext =
  | {
      mode: "doc";
      collectionSlug: string;
      docId: string;
    }
  | {
      mode: "global-doc";
      globalSlug: string;
    }
  | { mode: "global" };
