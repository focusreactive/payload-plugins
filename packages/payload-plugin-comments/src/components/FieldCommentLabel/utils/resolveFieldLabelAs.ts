export function resolveFieldLabelAs(
  type: string | undefined
): "h3" | "label" | "span" {
  if (type === "group") {return "h3";}
  if (type === "array" || type === "blocks") {return "span";}

  return "label";
}
