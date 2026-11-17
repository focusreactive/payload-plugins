import type { LexicalEditor, LexicalNode } from "lexical";

import {
  $getRoot,
  $getSelection,
  $isElementNode,
  $isRangeSelection,
  $isTextNode,
  $createNodeSelection,
  $createTextNode,
  $parseSerializedNode,
  $setSelection,
  CONTROLLED_TEXT_INSERTION_COMMAND,
  CUT_COMMAND,
  INSERT_PARAGRAPH_COMMAND,
  KEY_BACKSPACE_COMMAND,
  KEY_DELETE_COMMAND,
  REDO_COMMAND,
  UNDO_COMMAND,
} from "lexical";
import { $createListItemNode, $createListNode } from "@lexical/list";
import { $createHeadingNode, $createQuoteNode } from "@lexical/rich-text";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { EditSession } from "../../src/client/inlineEditing/richTextEditor";
import type { VeRichTextFormats } from "../../src/shared/richText/formats";

import { startEditSession } from "../../src/client/inlineEditing/richText/editSession";
import {
  DATA_VE_OPAQUE_ATTR,
  DATA_VE_OPAQUE_SELECTED_ATTR,
} from "../../src/client/inlineEditing/richText/opaqueNode";
import { DATA_VE_RICH_TEXT_TOOLBAR_ATTR } from "../../src/client/inlineEditing/richText/toolbar";

import { measureSelectionsAsEmpty } from "../support/selectionRects";
import { flushMutations } from "../support/time";

type Node = Record<string, unknown> & { children?: Node[] };

type State = { root: Node & { children: Node[] } };

const BOLD = 1;
const SCRIPT = "javascript";
const LINK_ID = /^[\da-f]{24}$/u;

const text = (value: string, format = 0): Node => ({
  detail: 0,
  format,
  mode: "normal",
  style: "",
  text: value,
  type: "text",
  version: 1,
});

const element = (type: string, children: Node[], extra: object = {}): Node => ({
  children,
  direction: null,
  format: "",
  indent: 0,
  type,
  version: 1,
  ...extra,
});

const paragraph = (...children: Node[]) =>
  element("paragraph", children, { textFormat: 0, textStyle: "" });

const heading = (tag: string, ...children: Node[]) => element("heading", children, { tag });

const stateOf = (...children: Node[]): State => ({
  root: { ...element("root", children), children },
});

const storedLink = (url: string, ...children: Node[]) =>
  element("link", children, {
    fields: { credit: 7, linkType: "custom", newTab: true, url },
    id: "link-stored",
    version: 3,
  });

const OPAQUE_BLOCKS: [string, Node][] = [
  [
    "block",
    {
      fields: { blockType: "callout", id: "b1", text: "Kept" },
      format: "",
      type: "block",
      version: 2,
    },
  ],
  [
    "upload",
    {
      fields: null,
      format: "",
      id: "u1",
      relationTo: "media",
      type: "upload",
      value: 3,
      version: 3,
    },
  ],
  ["relationship", { format: "", relationTo: "pages", type: "relationship", value: 9, version: 2 }],
  ["horizontalrule", { type: "horizontalrule", version: 1 }],
  [
    "table",
    element("table", [element("tablerow", [element("tablecell", [paragraph(text("Cell"))])])]),
  ],
  [
    "code",
    element("code", [{ ...text("const a = 1"), type: "code-highlight" }], { language: "js" }),
  ],
  [
    "a node of a feature the page does not know",
    { anything: [1, { deep: true }], type: "mystery", version: 9 },
  ],
];

const INLINE_BLOCK: Node = {
  fields: { blockType: "badge", id: "i1", label: "Kept" },
  type: "inlineBlock",
  version: 1,
};

const EVERY_FORMAT: VeRichTextFormats = {
  hasLinks: true,
  hasQuotes: true,
  headings: ["h1", "h2", "h3", "h4", "h5", "h6"],
  lists: ["bullet", "number", "check"],
  textFormats: 2047,
};

const ONLY_BOLD: VeRichTextFormats = {
  hasLinks: false,
  hasQuotes: false,
  headings: [],
  lists: [],
  textFormats: BOLD,
};

const textsOf = (block: Node) =>
  (block.children ?? []).map((child) =>
    child.type === "link"
      ? (child.children ?? []).map(({ text: part }) => `[${String(part)}]`)
      : child.text
  );

const lexicalOf = (twin: Element): LexicalEditor =>
  (twin as unknown as { __lexicalEditor: LexicalEditor }).__lexicalEditor;

const textNodesIn = (node: LexicalNode): LexicalNode[] => {
  if ($isTextNode(node)) return [node];
  return $isElementNode(node) ? node.getChildren().flatMap(textNodesIn) : [];
};

describe("one edit of rich text", () => {
  let twin: HTMLElement;
  let session: EditSession | null;
  let changes: State[];
  let onCancel: ReturnType<typeof vi.fn>;
  let onCommit: ReturnType<typeof vi.fn>;

  const start = (state: State, formats: VeRichTextFormats = EVERY_FORMAT) => {
    session = startEditSession({
      formats,
      onCancel,
      onChange: (changed) => changes.push(changed as State),
      onCommit,
      point: null,
      state,
      twin,
    });
    return session;
  };

  const latest = () => changes.at(-1) as State;

  const update = (change: () => void) => lexicalOf(twin).update(change, { discrete: true });

  const select = (textIndex: number, from: number, to: number) =>
    update(() => {
      const node = textNodesIn($getRoot())[textIndex];
      if ($isTextNode(node)) node.select(from, to);
    });

  const selectAcross = (fromIndex: number, toIndex: number) =>
    update(() => {
      const nodes = textNodesIn($getRoot());
      const [first, last] = [nodes[fromIndex], nodes[toIndex]];
      if (!$isTextNode(first) || !$isTextNode(last)) return;
      first.select(0, 0);
      const selection = $getSelection();
      if ($isRangeSelection(selection)) {
        selection.focus.set(last.getKey(), last.getTextContentSize(), "text");
      }
    });

  const typeOver = (typed: string) =>
    update(() => {
      const selection = $getSelection();
      if ($isRangeSelection(selection)) selection.insertText(typed);
    });

  const toolbarHost = () =>
    document.querySelector<HTMLElement>(`[${DATA_VE_RICH_TEXT_TOOLBAR_ATTR}]`) as HTMLElement;

  const toolbar = () => toolbarHost().shadowRoot as ShadowRoot;

  const isToolbarShown = () => toolbarHost().style.display !== "none";

  const button = (action: string) =>
    toolbar().querySelector<HTMLButtonElement>(`[data-action="${action}"]`) as HTMLButtonElement;

  const isPressed = (action: string) => button(action).getAttribute("aria-pressed") === "true";

  const linkInput = () => toolbar().querySelector("input") as HTMLInputElement;

  const pressInLinkInput = (key: string) => {
    const event = new KeyboardEvent("keydown", { bubbles: true, cancelable: true, key });
    linkInput().dispatchEvent(event);
    return event;
  };

  const applyLink = (url: string) => {
    button("link").click();
    linkInput().value = url;
    pressInLinkInput("Enter");
  };

  const pressInTwin = (key: string, init: KeyboardEventInit = {}) => {
    const event = new KeyboardEvent("keydown", { bubbles: true, cancelable: true, key, ...init });
    twin.dispatchEvent(event);
    return event;
  };

  const deleteWith = (command: typeof KEY_BACKSPACE_COMMAND) => {
    const event = new KeyboardEvent("keydown", { cancelable: true });
    update(() => lexicalOf(twin).dispatchCommand(command, event));
    return event;
  };

  const placeholders = () =>
    [...twin.querySelectorAll(`[${DATA_VE_OPAQUE_ATTR}]`)].map((placeholder) => ({
      isEditable: (placeholder as HTMLElement).contentEditable,
      name: placeholder.getAttribute(DATA_VE_OPAQUE_ATTR),
      shown: placeholder.textContent,
    }));

  beforeEach(() => {
    measureSelectionsAsEmpty();
    document.body.innerHTML = "";
    twin = document.createElement("div");
    document.body.append(twin);
    changes = [];
    onCancel = vi.fn();
    onCommit = vi.fn();
    session = null;
  });

  afterEach(() => {
    session?.end();
    document.getSelection()?.removeAllRanges();
  });

  describe("a node the page cannot edit", () => {
    it.each(OPAQUE_BLOCKS)("is kept as it is stored: %s", (_name, node) => {
      const state = stateOf(paragraph(text("Before")), node, paragraph(text("After")));
      start(state);

      select(0, 0, 6);
      typeOver("Changed");

      expect(JSON.stringify(latest().root.children[1])).toBe(JSON.stringify(node));
      expect(latest().root.children[0]).toEqual(paragraph(text("Changed")));
      expect(latest().root.children[2]).toEqual(paragraph(text("After")));
    });

    it("is kept as it is stored inside a paragraph: an inline block", () => {
      start(stateOf(paragraph(text("Before "), INLINE_BLOCK, text(" after"))));

      select(0, 0, 6);
      typeOver("Changed");

      expect(latest().root.children[0]!.children).toEqual([
        text("Changed "),
        INLINE_BLOCK,
        text(" after"),
      ]);
      expect(JSON.stringify(latest().root.children[0]!.children![1])).toBe(
        JSON.stringify(INLINE_BLOCK)
      );
    });

    it("keeps its place among the others", () => {
      const nodes = OPAQUE_BLOCKS.map(([, node]) => node);
      start(stateOf(paragraph(text("Before")), ...nodes));

      select(0, 0, 6);
      typeOver("Changed");

      expect(JSON.stringify(latest().root.children.slice(1))).toBe(JSON.stringify(nodes));
    });

    it("is shown as a placeholder that names its type and cannot be typed into", () => {
      start(
        stateOf(
          paragraph(text("Before "), INLINE_BLOCK),
          OPAQUE_BLOCKS[0]![1],
          OPAQUE_BLOCKS[3]![1]
        )
      );

      expect(placeholders()).toEqual([
        { isEditable: "false", name: "inlineBlock: badge", shown: "inlineBlock: badge" },
        { isEditable: "false", name: "block: callout", shown: "block: callout" },
        { isEditable: "false", name: "horizontalrule", shown: "horizontalrule" },
      ]);
      expect(twin.textContent).not.toContain("Kept");
    });

    describe("cannot be taken away", () => {
      const BLOCK = OPAQUE_BLOCKS[0]![1];

      const typesOfRoot = () =>
        lexicalOf(twin)
          .getEditorState()
          .read(() =>
            $getRoot()
              .getChildren()
              .map((node) => node.getType())
          );

      const shownBlocks = () => placeholders().map(({ name }) => name);

      it("by a Backspace right after it", () => {
        start(stateOf(paragraph(text("Before")), BLOCK, paragraph(text("After"))));
        select(1, 0, 0);

        const pressed = deleteWith(KEY_BACKSPACE_COMMAND);
        deleteWith(KEY_BACKSPACE_COMMAND);

        expect(pressed.defaultPrevented).toBe(true);
        expect(changes).toEqual([]);
        expect(shownBlocks()).toEqual(["block: callout"]);
      });

      it("by a Delete right before it", () => {
        start(stateOf(paragraph(text("Before"), INLINE_BLOCK, text("after"))));
        select(0, 6, 6);

        deleteWith(KEY_DELETE_COMMAND);
        deleteWith(KEY_DELETE_COMMAND);

        expect(changes).toEqual([]);
        expect(shownBlocks()).toEqual(["inlineBlock: badge"]);
      });

      it("by a Backspace while it is selected", () => {
        start(stateOf(paragraph(text("Before")), BLOCK));
        update(() => {
          const selection = $createNodeSelection();
          selection.add($getRoot().getLastChildOrThrow().getKey());
          $setSelection(selection);
        });

        deleteWith(KEY_BACKSPACE_COMMAND);

        expect(twin.querySelector(`[${DATA_VE_OPAQUE_SELECTED_ATTR}]`)).not.toBeNull();
        expect(changes).toEqual([]);
      });

      it("by a Backspace over a selection that spans it, which removes the text alone", () => {
        start(stateOf(paragraph(text("Before")), BLOCK, paragraph(text("After"))));
        selectAcross(0, 1);

        deleteWith(KEY_BACKSPACE_COMMAND);

        expect(latest().root.children).toEqual([paragraph(), BLOCK, paragraph()]);
      });

      it("by text typed over a selection that spans it", () => {
        start(stateOf(paragraph(text("Before")), BLOCK, paragraph(text("After"))));
        selectAcross(0, 1);

        update(() => lexicalOf(twin).dispatchCommand(CONTROLLED_TEXT_INSERTION_COMMAND, "X"));

        expect(JSON.stringify(latest().root.children[1])).toBe(JSON.stringify(BLOCK));
        expect(twin.textContent).toContain("X");
        expect(twin.textContent).not.toContain("Before");
      });

      it("by a cut of a selection that spans it", () => {
        start(stateOf(paragraph(text("Before")), BLOCK, paragraph(text("After"))));
        selectAcross(0, 1);

        update(() => lexicalOf(twin).dispatchCommand(CUT_COMMAND, null));

        expect(latest().root.children).toEqual([paragraph(), BLOCK, paragraph()]);
      });

      it("by a new paragraph started over a selection that spans it", () => {
        start(stateOf(paragraph(text("Before")), BLOCK, paragraph(text("After"))));
        selectAcross(0, 1);

        update(() => lexicalOf(twin).dispatchCommand(INSERT_PARAGRAPH_COMMAND, undefined));

        expect(shownBlocks()).toEqual(["block: callout"]);
      });

      it("by anything else that removes it: the change is taken back", async () => {
        start(stateOf(paragraph(text("Before")), BLOCK));

        update(() => $getRoot().getLastChildOrThrow().remove());
        await flushMutations();

        expect(typesOfRoot()).toEqual(["paragraph", "ve-opaque"]);
        expect(changes).toEqual([]);
      });

      it("and cannot be moved before another one", async () => {
        start(stateOf(BLOCK, paragraph(text("Between")), OPAQUE_BLOCKS[3]![1]));

        update(() => {
          const root = $getRoot();
          root.getFirstChildOrThrow().insertBefore(root.getLastChildOrThrow());
        });
        await flushMutations();

        expect(shownBlocks()).toEqual(["block: callout", "horizontalrule"]);
        expect(changes).toEqual([]);
      });

      it("and a copy of it that is pasted is dropped", () => {
        start(stateOf(paragraph(text("Before")), BLOCK));

        update(() => {
          const copy = $parseSerializedNode({
            isInline: false,
            kept: BLOCK,
            type: "ve-opaque",
            version: 1,
          } as never);
          $getRoot().append(copy);
        });

        expect(shownBlocks()).toEqual(["block: callout"]);
      });
    });
  });

  describe("a link that is split by Enter", () => {
    const internal = (...children: Node[]) =>
      element("link", children, {
        fields: {
          credit: 7,
          doc: { relationTo: "pages", value: 3 },
          linkType: "internal",
          newTab: true,
        },
        id: "link-internal",
        version: 3,
      });

    it("keeps the order of the text and gives the second half the fields of the first", () => {
      start(stateOf(paragraph(text("Hello "), internal(text("internal")), text(" tail"))));
      select(1, 5, 5);

      update(() => lexicalOf(twin).dispatchCommand(INSERT_PARAGRAPH_COMMAND, undefined));

      const [first, second] = latest().root.children;
      expect(latest().root.children).toHaveLength(2);
      expect(textsOf(first!).flat().join("")).toBe("Hello [inter]");
      expect(textsOf(second!).flat().join("")).toBe("[nal] tail");
      const [, kept] = first!.children as Node[];
      const [added] = second!.children as Node[];
      expect(kept).toMatchObject({ fields: internal().fields, id: "link-internal" });
      expect(added!.fields).toEqual(internal().fields);
      expect(added!.id).toMatch(LINK_ID);
      expect(added!.id).not.toBe("link-internal");
    });
  });

  describe("a field that allows bold alone", () => {
    const visibleActions = () =>
      [...toolbar().querySelectorAll("button")]
        .filter((control) => !control.hidden)
        .map((control) => control.getAttribute("data-action"));

    beforeEach(() => {
      start(stateOf(paragraph(text("Hello world"))), ONLY_BOLD);
    });

    it("offers the bold button alone", () => {
      select(0, 0, 5);

      expect(visibleActions()).toEqual(["bold"]);
    });

    it("ignores the keys of the other formats and of the link", async () => {
      select(0, 0, 5);

      pressInTwin("i", { ctrlKey: true });
      pressInTwin("u", { ctrlKey: true });
      pressInTwin("k", { ctrlKey: true });
      await flushMutations();

      expect(changes).toEqual([]);
      expect(linkInput().hidden).toBe(true);
    });

    it("turns what a paste brings in and the field does not allow into paragraphs of plain text", () => {
      update(() => {
        const slanted = $createTextNode("Heading").toggleFormat("italic").setStyle("color: red");
        const quoted = $createTextNode("Quote").toggleFormat("bold");
        const listed = $createListItemNode().append($createTextNode("Item"));
        $getRoot().append(
          $createHeadingNode("h1").append(slanted),
          $createQuoteNode().append(quoted),
          $createListNode("bullet").append(listed)
        );
      });

      expect(latest().root.children).toEqual([
        paragraph(text("Hello world")),
        paragraph(text("Heading")),
        { ...paragraph(text("Quote", BOLD)), textFormat: BOLD },
        paragraph(text("Item")),
      ]);
    });

    it("shows no toolbar at all for a field that allows no format", () => {
      session?.end();
      start(stateOf(paragraph(text("Hello world"))), { ...ONLY_BOLD, textFormats: 0 });

      select(0, 0, 5);

      expect(isToolbarShown()).toBe(false);
    });
  });

  describe("a state the editor cannot hold", () => {
    it("starts no edit and leaves no toolbar", () => {
      expect(start(stateOf(text("A text node the root cannot hold")))).toBeNull();
      expect(document.querySelector(`[${DATA_VE_RICH_TEXT_TOOLBAR_ATTR}]`)).toBeNull();
    });

    it("starts a paragraph in a state without content", () => {
      start(stateOf());

      update(() => $getRoot().selectEnd());
      typeOver("First words");

      expect(latest().root.children).toEqual([paragraph(text("First words"))]);
    });
  });

  describe("the toolbar", () => {
    beforeEach(() => {
      start(
        stateOf(
          paragraph(text("Hello "), text("world", BOLD)),
          heading("h2", text("A heading")),
          paragraph(text("Read "), storedLink("https://example.com/docs", text("the docs")))
        )
      );
    });

    it("is hidden until text is selected, and hidden again when the selection collapses", () => {
      expect(isToolbarShown()).toBe(false);

      select(0, 0, 5);
      expect(isToolbarShown()).toBe(true);

      select(0, 2, 2);
      expect(isToolbarShown()).toBe(false);
    });

    it("holds a labelled toggle button for every format", () => {
      const buttons = [...toolbar().querySelectorAll("button")];

      expect(buttons.map((control) => control.getAttribute("aria-label"))).toEqual([
        "Bold",
        "Italic",
        "Underline",
        "Link",
        "Heading 2",
        "Heading 3",
        "Bullet list",
        "Numbered list",
      ]);
      expect(buttons.every((control) => control.type === "button")).toBe(true);
      expect(buttons.every((control) => control.hasAttribute("aria-pressed"))).toBe(true);
      expect(toolbar().querySelector('[role="toolbar"]')?.getAttribute("aria-label")).toBe(
        "Text formatting"
      );
    });

    it("shows the formats of the selected text", () => {
      select(1, 0, 5);
      expect(["bold", "h2", "h3", "link"].map(isPressed)).toEqual([true, false, false, false]);

      select(2, 0, 4);
      expect(["bold", "h2", "h3", "link"].map(isPressed)).toEqual([false, true, false, false]);

      select(4, 0, 3);
      expect(["bold", "h2", "link"].map(isPressed)).toEqual([false, false, true]);
    });

    it("keeps the selection of the page when a button is pressed", () => {
      const press = new MouseEvent("mousedown", { bubbles: true, cancelable: true });

      button("bold").dispatchEvent(press);

      expect(press.defaultPrevented).toBe(true);
    });

    it.each([
      ["bold", 1],
      ["italic", 2],
      ["underline", 8],
    ])("turns %s on and off for the selected text", (action, format) => {
      select(0, 0, 5);

      button(action).click();
      expect(isPressed(action)).toBe(true);
      expect(latest().root.children[0]!.children![0]).toEqual(text("Hello", format));

      button(action).click();
      expect(isPressed(action)).toBe(false);
      expect(latest().root.children[0]!.children![0]).toEqual(text("Hello "));
    });

    it("turns a paragraph into a heading, one heading into another and a heading into a paragraph", () => {
      select(0, 0, 5);

      button("h2").click();
      expect(latest().root.children[0]).toMatchObject({ tag: "h2", type: "heading" });
      expect([isPressed("h2"), isPressed("h3")]).toEqual([true, false]);

      button("h3").click();
      expect(latest().root.children[0]).toMatchObject({ tag: "h3", type: "heading" });
      expect([isPressed("h2"), isPressed("h3")]).toEqual([false, true]);

      button("h3").click();
      expect(latest().root.children[0]).toMatchObject({ type: "paragraph" });
      expect(isPressed("h3")).toBe(false);
      expect(latest().root.children[0]!.children).toEqual([text("Hello "), text("world", BOLD)]);
    });

    it.each([
      ["bullet", "bullet", "ul"],
      ["number", "number", "ol"],
    ])("turns a paragraph into a %s list and back", (action, listType, tag) => {
      select(0, 0, 5);

      button(action).click();
      expect(latest().root.children[0]).toMatchObject({
        children: [{ children: [text("Hello "), text("world", BOLD)], type: "listitem" }],
        listType,
        tag,
        type: "list",
      });
      expect(isPressed(action)).toBe(true);

      button(action).click();
      expect(latest().root.children[0]).toMatchObject({ type: "paragraph" });
      expect(isPressed(action)).toBe(false);
    });

    it("follows the keyboard for bold, italic and underline", async () => {
      select(0, 0, 5);

      pressInTwin("b", { ctrlKey: true });
      pressInTwin("i", { ctrlKey: true });
      pressInTwin("u", { ctrlKey: true });
      await flushMutations();

      expect(["bold", "italic", "underline"].map(isPressed)).toEqual([true, true, true]);
      expect(latest().root.children[0]!.children![0]).toEqual(text("Hello", 11));
    });

    describe("link", () => {
      it("opens an address field, with the keyboard too", () => {
        select(0, 0, 5);
        expect(linkInput().hidden).toBe(true);

        const key = pressInTwin("k", { ctrlKey: true });

        expect(key.defaultPrevented).toBe(true);
        expect(linkInput().hidden).toBe(false);
        expect(linkInput().getAttribute("aria-label")).toBe("Link address");
        expect(toolbar().activeElement).toBe(linkInput());
      });

      it("does nothing without a selected range, by key or by button", () => {
        select(0, 2, 2);

        pressInTwin("k", { ctrlKey: true });

        expect(linkInput().hidden).toBe(true);
        expect(isToolbarShown()).toBe(false);
        expect(changes).toEqual([]);
      });

      it("links the selected text on Enter, in the shape Payload stores", () => {
        select(0, 0, 5);

        applyLink("https://example.com/new");

        const [linked, rest] = latest().root.children[0]!.children as Node[];
        expect(linked).toMatchObject({
          children: [text("Hello")],
          fields: { linkType: "custom", newTab: false, url: "https://example.com/new" },
          type: "link",
          version: 3,
        });
        expect(linked!.id).toMatch(LINK_ID);
        expect(rest).toEqual(text(" "));
        expect(linkInput().hidden).toBe(true);
        expect(isPressed("link")).toBe(true);
        expect(twin.querySelector("a")?.getAttribute("href")).toBe("https://example.com/new");
      });

      it.each(["/about", "#section", "mailto:ada@example.com", "tel:+375291234567"])(
        "takes %s",
        (url) => {
          select(0, 0, 5);

          applyLink(`  ${url} `);

          expect(latest().root.children[0]!.children![0]!.fields).toMatchObject({ url });
        }
      );

      it.each([`${SCRIPT}:alert(1)`, "data:text/html,x", "ftp://files.example.com"])(
        "refuses %s and keeps the field open",
        (url) => {
          select(0, 0, 5);

          applyLink(url);

          expect(changes).toEqual([]);
          expect(linkInput().hidden).toBe(false);
          expect(linkInput().getAttribute("aria-invalid")).toBe("true");
          expect(twin.querySelectorAll("a")).toHaveLength(1);
        }
      );

      it("shows the address of a stored link and changes it alone", () => {
        select(4, 0, 3);

        button("link").click();
        expect(linkInput().value).toBe("https://example.com/docs");
        linkInput().value = "/docs";
        pressInLinkInput("Enter");

        expect(latest().root.children[2]!.children![1]).toEqual({
          ...storedLink("/docs", text("the docs")),
          fields: { credit: 7, linkType: "custom", newTab: true, url: "/docs" },
        });
      });

      it("removes the link when the address is emptied", () => {
        select(4, 0, 3);

        applyLink("");

        expect(latest().root.children[2]!.children).toEqual([text("Read the docs")]);
        expect(isPressed("link")).toBe(false);
      });

      it("closes the field on Escape without a change and without ending the edit", () => {
        select(0, 0, 5);
        button("link").click();
        linkInput().value = "https://example.com/new";

        const escape = pressInLinkInput("Escape");

        expect(linkInput().hidden).toBe(true);
        expect(escape.defaultPrevented).toBe(true);
        expect(changes).toEqual([]);
        expect(onCancel).not.toHaveBeenCalled();
        expect(isToolbarShown()).toBe(true);
      });

      it("writes no address the page may not follow into the twin", () => {
        session?.end();
        start(stateOf(paragraph(storedLink(`${SCRIPT}:alert(1)`, text("Stored")))));

        expect(twin.querySelector("a")?.hasAttribute("href")).toBe(false);
      });
    });
  });

  describe("ending", () => {
    beforeEach(() => {
      start(stateOf(paragraph(text("Hello world"))));
    });

    it("asks to cancel on Escape", () => {
      pressInTwin("Escape");

      expect(onCancel).toHaveBeenCalledTimes(1);
      expect(onCommit).not.toHaveBeenCalled();
    });

    it("asks to commit on a press outside the twin and the toolbar", () => {
      twin.dispatchEvent(new MouseEvent("pointerdown", { bubbles: true }));
      toolbarHost().dispatchEvent(new MouseEvent("pointerdown", { bubbles: true }));
      expect(onCommit).not.toHaveBeenCalled();

      document.body.dispatchEvent(new MouseEvent("pointerdown", { bubbles: true }));
      expect(onCommit).toHaveBeenCalledTimes(1);
    });

    it("asks to commit when the focus leaves for another element, not for the toolbar", () => {
      const other = document.createElement("button");
      document.body.append(other);

      twin.dispatchEvent(
        new FocusEvent("focusout", { bubbles: true, relatedTarget: toolbarHost() })
      );
      twin.dispatchEvent(new FocusEvent("focusout", { bubbles: true, relatedTarget: null }));
      expect(onCommit).not.toHaveBeenCalled();

      twin.dispatchEvent(new FocusEvent("focusout", { bubbles: true, relatedTarget: other }));
      expect(onCommit).toHaveBeenCalledTimes(1);
    });

    it("undoes and redoes what was typed", () => {
      select(0, 6, 11);
      typeOver("there");
      expect(latest().root.children).toEqual([paragraph(text("Hello there"))]);

      update(() => lexicalOf(twin).dispatchCommand(UNDO_COMMAND, undefined));
      expect(latest().root.children).toEqual([paragraph(text("Hello world"))]);

      update(() => lexicalOf(twin).dispatchCommand(REDO_COMMAND, undefined));
      expect(latest().root.children).toEqual([paragraph(text("Hello there"))]);
    });

    it("starts a new paragraph where the text is split", () => {
      select(0, 5, 5);

      update(() => {
        const selection = $getSelection();
        if ($isRangeSelection(selection)) selection.insertParagraph();
      });

      expect(latest().root.children).toEqual([paragraph(text("Hello")), paragraph(text(" world"))]);
    });

    it("removes the toolbar and stops listening when it ends", () => {
      session?.end();
      session = null;

      document.body.dispatchEvent(new MouseEvent("pointerdown", { bubbles: true }));

      expect(document.querySelector(`[${DATA_VE_RICH_TEXT_TOOLBAR_ATTR}]`)).toBeNull();
      expect(onCommit).not.toHaveBeenCalled();
    });

    it("formats across several text nodes at once", () => {
      session?.end();
      start(stateOf(paragraph(text("One")), paragraph(text("Two"))));
      selectAcross(0, 1);

      button("bold").click();

      expect(latest().root.children.map((block) => block.children)).toEqual([
        [text("One", BOLD)],
        [text("Two", BOLD)],
      ]);
    });
  });
});
