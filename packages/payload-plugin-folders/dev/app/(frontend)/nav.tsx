import config from "@payload-config";
import { getTree } from "@focus-reactive/payload-plugin-folders/server";
import type { TreeNode } from "@focus-reactive/payload-plugin-folders/server";
import { getPayload } from "payload";

const NavNodes = ({ nodes }: { nodes: TreeNode[] }) => (
  <ul>
    {nodes.map((node) => (
      <li key={`${node.collection}:${node.id}`}>
        {/* A folder is a link only when it has a root page; otherwise it is just a heading. */}
        {node.kind === "page" || node.hasPage ? (
          <a href={node.fullPath}>{node.title}</a>
        ) : (
          <span>{node.title}</span>
        )}
        {node.children.length > 0 ? <NavNodes nodes={node.children} /> : null}
      </li>
    ))}
  </ul>
);

/** The first two levels of the published site, from `getTree`. */
export const Nav = async () => {
  const payload = await getPayload({ config });
  const nodes = await getTree(payload, { depth: 2 });

  return (
    <nav aria-label="Site">
      <NavNodes nodes={nodes} />
    </nav>
  );
};
