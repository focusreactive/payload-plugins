/** What a key press needs to say for the tree to decide whether it opens Settings. */
export type KeyFacts = {
  altKey: boolean;
  ctrlKey: boolean;
  key: string;
  metaKey: boolean;
  shiftKey: boolean;
  /** Whether the press happened inside something the editor types in. */
  targetIsTextInput: boolean;
};

/**
 * F2 opens Settings for the focused row (spec section 7.6). A press inside a text field is the
 * field's own, and any modifier makes it another shortcut.
 */
export const opensSettings = ({
  altKey,
  ctrlKey,
  key,
  metaKey,
  shiftKey,
  targetIsTextInput,
}: KeyFacts): boolean =>
  key === "F2" && !altKey && !ctrlKey && !metaKey && !shiftKey && !targetIsTextInput;

const nonTextInputTypes = new Set(["button", "checkbox", "radio", "reset", "submit"]);

/**
 * Whether typing into this element is the element's own: a text field, a select or an editable
 * region. A row's checkbox is not one, so F2 on it still opens Settings.
 */
export const isTextEntry = ({
  inputType,
  isContentEditable,
  tagName,
}: {
  inputType: string | null;
  isContentEditable: boolean;
  tagName: string;
}): boolean =>
  isContentEditable ||
  tagName === "SELECT" ||
  tagName === "TEXTAREA" ||
  (tagName === "INPUT" && !nonTextInputTypes.has(inputType ?? "text"));
