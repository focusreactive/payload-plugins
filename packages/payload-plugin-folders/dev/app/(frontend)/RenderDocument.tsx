type Block = { blockType?: string; body?: string; heading?: string };

/** The least a host needs to show a resolved document: its title and whatever text it carries. */
export const RenderDocument = ({
  collection,
  doc,
}: {
  collection: string;
  doc: Record<string, unknown>;
}) => {
  const blocks = Array.isArray(doc.blocks) ? (doc.blocks as Block[]) : [];

  return (
    <article data-collection={collection}>
      <h1>{String(doc.title ?? "")}</h1>
      {typeof doc.body === "string" ? <p>{doc.body}</p> : null}
      {blocks.map((block, index) => (
        // The blocks have no ids of their own in this sandbox, so their position is their key.
        <section key={index}>
          {block.heading ? <h2>{block.heading}</h2> : null}
          {block.body ? <p>{block.body}</p> : null}
        </section>
      ))}
    </article>
  );
};
