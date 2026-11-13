/**
 * The text the plugin appends to the MCP server instructions, which a client puts in the model's
 * context at connect time. It is one string so a skill for the same readers can reuse it.
 */
export const foldersMcpInstructions = `The content of this site is a tree: pages live in folders, and folders live in folders. A page's URL is the slugs of its folders plus its own slug, so moving a page or renaming a folder changes live URLs. A folder's name, slug and URL exist once per language, and a language without its own value shows the default language's one (fallback).

To read the tree in every language, call browseTree. findDocuments with locale "all" also returns every language.

To change the tree:
- Move or reorder pages or folders with previewMove, then applyTreeChange. updateDocument cannot change folder or parent.
- Rename a folder with previewRename, then applyTreeChange. updateDocument refuses a folder slug change.
- Create a folder with createFolder.

Preview, then confirm with the user, then apply:
1. Call the preview tool. It writes nothing. It shows which live URLs change, in which languages, with examples.
2. Show the user the summary and the questions in askUser and wait for their answer. Do not answer for them, and do not apply a change they have not seen.
3. Call applyTreeChange with the confirmationToken, and with confirmedSummary exactly as the preview wrote it when it asks for one.

Languages: when you create or rename, ask the user for the text in every language, or tell them which languages will fall back to the default one and let them choose. Do not translate on your own.

After a write, tell the user the new URLs from the tool's result, which reads them back from the site. Do not report URLs from memory or from what you expected.

updateDocument publishes by default: its draft argument defaults to false. Pass draft true to save a draft instead.`;

/** The folders MCP tools a stock tool description may name. */
export type StockDescriptionTools = {
  browseTree: boolean;
  canMove: boolean;
  canRename: boolean;
  createFolder: boolean;
};

const treeModel =
  "The content is a tree: pages sit in folders and folders sit in folders, and a page's URL is its folders' slugs plus its own slug, in each language. A folder has a name and a slug per language.";

/**
 * The descriptions of the stock tools on folders and page collections, by the tool's key in
 * plugin-mcp. plugin-mcp shows one text per tool, taken from the first collection that has it, so
 * these are written for every collection at once. A rule names a folders tool only when that tool
 * is on, because the model would otherwise be sent to a tool that does not exist.
 */
export const buildStockToolDescriptions = ({
  browseTree,
  canMove,
  canRename,
  createFolder,
}: StockDescriptionTools): Record<"create" | "find" | "update", string> => {
  const moveRule = canMove
    ? "The folder of a page and the parent of a folder change only through previewMove and applyTreeChange: this tool refuses such a write and saves nothing."
    : "The folder of a page and the parent of a folder cannot be changed with this tool: it refuses such a write and saves nothing.";
  const renameRule = canRename
    ? "A folder's slug is part of the live URL of every page beneath it, so a slug change goes through previewRename and applyTreeChange."
    : "A folder's slug cannot be changed with this tool.";

  return {
    create: [
      "Create one or more documents. Each can have different data or a file. Prefer uploadReference after upload, externalURL for URLs, or base64 for small local files.",
      treeModel,
      createFolder
        ? "To create a folder use createFolder, which writes the name in every language in one step."
        : "",
      "Without locale only the default language is written; pass locale all with one value per language to write every language at once. A page's folder is set when it is created and changes later only through the folder tree tools.",
    ]
      .filter(Boolean)
      .join(" "),
    find: [
      "Find documents in any collection by passing the collection slug and optional ID or where clause.",
      treeModel,
      "Without locale only the default language is returned. Pass locale all to get every language: name, slug and fullPath then come back as one value per language, empty where a language has none of its own.",
      browseTree ? "browseTree shows the whole tree in every language in one call." : "",
    ]
      .filter(Boolean)
      .join(" "),
    update: [
      "Update documents. Prefer uploadReference after upload, externalURL for URLs, or base64 for small local files.",
      treeModel,
      moveRule,
      renameRule,
      "Other fields, such as a title or a folder's name, can be changed here.",
      "This tool publishes by default: its draft argument defaults to false, so the edit goes live. Pass draft true to save a draft instead.",
      "Without locale only the default language is written; pass locale all with one value per language to write every language at once.",
    ].join(" "),
  };
};
