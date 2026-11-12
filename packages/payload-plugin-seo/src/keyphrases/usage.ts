export interface UsageDoc {
  collection: string;
  id: string;
  title: string;
}

function adminURL(adminRoute: string, path: string): string {
  return adminRoute === "/" ? path : `${adminRoute}${path}`;
}

export function adminDocHref(adminRoute: string, doc: Pick<UsageDoc, "collection" | "id">): string {
  return adminURL(adminRoute, `/collections/${doc.collection}/${doc.id}`);
}
