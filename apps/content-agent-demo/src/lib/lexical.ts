type LexicalTextNode = {
  detail: number;
  format: number;
  mode: string;
  style: string;
  text: string;
  type: "text";
  version: number;
};

type LexicalParagraphNode = {
  children: LexicalTextNode[];
  direction: "ltr";
  format: "";
  indent: number;
  textFormat: number;
  type: "paragraph";
  version: number;
};

export type LexicalState = {
  root: {
    children: LexicalParagraphNode[];
    direction: "ltr";
    format: "";
    indent: number;
    type: "root";
    version: number;
  };
};

function paragraph(text: string): LexicalParagraphNode {
  return {
    children: [{ detail: 0, format: 0, mode: "normal", style: "", text, type: "text", version: 1 }],
    direction: "ltr",
    format: "",
    indent: 0,
    textFormat: 0,
    type: "paragraph",
    version: 1,
  };
}

export function richText(...paragraphs: string[]): LexicalState {
  return {
    root: {
      children: paragraphs.map(paragraph),
      direction: "ltr",
      format: "",
      indent: 0,
      type: "root",
      version: 1,
    },
  };
}
