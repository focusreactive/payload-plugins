interface RelDoc {
  id: string | number;
}

export function pickSoleId(docs: RelDoc[]): string | number | null {
  return docs.length === 1 ? docs[0].id : null;
}
