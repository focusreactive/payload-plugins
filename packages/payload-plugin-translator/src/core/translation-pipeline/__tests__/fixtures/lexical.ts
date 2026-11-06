export const text = (value: string, format = 0) => ({
  type: "text",
  text: value,
  format,
  detail: 0,
  mode: "normal",
  style: "",
  version: 1,
});

export const paragraph = (children: unknown[]) => ({
  type: "paragraph",
  children,
  format: "",
  indent: 0,
  version: 1,
  direction: "ltr",
});

export const richText = (paragraphs: unknown[]) => ({
  root: { type: "root", children: paragraphs, format: "", indent: 0, version: 1, direction: "ltr" },
});

export const link = (url: string, children: unknown[]) => ({
  type: "link",
  fields: { url, linkType: "custom" },
  children,
  version: 3,
});
