export const textNode = (text: string, format = 0) => ({ format, text, type: "text", version: 1 });

export const paragraph = (...children: object[]) => ({ children, type: "paragraph", version: 1 });

export const editorState = (...children: object[]) => ({
  root: { children, type: "root", version: 1 },
});

type TextNode = ReturnType<typeof textNode>;

export type EditorState = {
  root: {
    children: { children: TextNode[]; type: string; version: number }[];
    type: string;
    version: number;
  };
};

export const paragraphsOf = (...paragraphs: string[][]): EditorState => ({
  root: {
    children: paragraphs.map((leaves) => ({
      children: leaves.map((leaf) => textNode(leaf)),
      type: "paragraph",
      version: 1,
    })),
    type: "root",
    version: 1,
  },
});

export const paragraphsWith = (...texts: string[]): EditorState =>
  paragraphsOf(...texts.map((text) => (text === "" ? [] : [text])));
