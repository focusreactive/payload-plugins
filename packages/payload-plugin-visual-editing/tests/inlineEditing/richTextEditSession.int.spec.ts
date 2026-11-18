import type { ElementNode, LexicalEditor, LexicalNode } from "lexical";

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

import type {
  EditSession,
  EditSessionOptions,
} from "../../src/client/inlineEditing/richTextEditor";
import type { VeRichTextFormats } from "../../src/shared/richText/formats";

import { startEditSession } from "../../src/client/inlineEditing/richText/editSession";
import {
  DATA_VE_OPAQUE_ATTR,
  DATA_VE_OPAQUE_SELECTED_ATTR,
} from "../../src/client/inlineEditing/richText/opaqueNode";
import { DATA_VE_RICH_TEXT_TOOLBAR_ATTR } from "../../src/client/inlineEditing/richText/toolbar";

import { measureSelectionsAsEmpty } from "../support/selectionRects";
import { flushMutations } from "../support/time";
import { zoomEveryElement, zoomNoElement } from "../support/zoom";

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

const isShown = (shown: Element) => getComputedStyle(shown).display !== "none";

const renderedBy = (html: string) => {
  const rendered = document.createElement("section");
  rendered.innerHTML = html;
  document.body.append(rendered);
  return rendered;
};

describe("one edit of rich text", () => {
  let twin: HTMLElement;
  let session: EditSession | null;
  let changes: State[];
  let onCancel: ReturnType<typeof vi.fn>;
  let onCommit: ReturnType<typeof vi.fn>;

  const start = (
    state: State,
    formats: VeRichTextFormats = EVERY_FORMAT,
    shown: Partial<Pick<EditSessionOptions, "caret" | "rendered">> = {}
  ) => {
    session = startEditSession({
      caret: null,
      formats,
      onCancel,
      onChange: (changed) => changes.push(changed as State),
      onCommit,
      rendered: null,
      state,
      twin,
      ...shown,
    });
    return session;
  };

  const latest = () => changes.at(-1) as State;

  const lexicalStateOf = () => lexicalOf(twin).getEditorState().toJSON() as unknown as State;

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

  const selectedText = () =>
    lexicalOf(twin)
      .getEditorState()
      .read(() => $getSelection()?.getTextContent());

  const caret = () =>
    lexicalOf(twin)
      .getEditorState()
      .read(() => {
        const selection = $getSelection();
        if (!$isRangeSelection(selection) || !selection.isCollapsed()) return null;
        return [selection.anchor.getNode().getTextContent(), selection.anchor.offset];
      });

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

    const selectedBlocks = () =>
      [...twin.querySelectorAll(`[${DATA_VE_OPAQUE_SELECTED_ATTR}]`)].map((placeholder) =>
        placeholder.getAttribute(DATA_VE_OPAQUE_ATTR)
      );

    const selectNode = (index: number) =>
      update(() => {
        const selection = $createNodeSelection();
        selection.add(($getRoot().getChildAtIndex(index) as LexicalNode).getKey());
        $setSelection(selection);
      });

    const undo = () => update(() => lexicalOf(twin).dispatchCommand(UNDO_COMMAND, undefined));

    describe("is removed by one deliberate action", () => {
      it("a Backspace right after it selects it and the next one removes it", () => {
        start(stateOf(paragraph(text("Before")), BLOCK, paragraph(text("After"))));
        select(1, 0, 0);

        const pressed = deleteWith(KEY_BACKSPACE_COMMAND);
        expect(pressed.defaultPrevented).toBe(true);
        expect(changes).toEqual([]);
        expect(selectedBlocks()).toEqual(["block: callout"]);

        deleteWith(KEY_BACKSPACE_COMMAND);
        expect(latest().root.children).toEqual([
          paragraph(text("Before")),
          paragraph(text("After")),
        ]);
        expect(shownBlocks()).toEqual([]);
      });

      it("a Delete right before it selects it and the next one removes it", () => {
        start(stateOf(paragraph(text("Before"), INLINE_BLOCK, text("after"))));
        select(0, 6, 6);

        deleteWith(KEY_DELETE_COMMAND);
        expect(changes).toEqual([]);
        expect(selectedBlocks()).toEqual(["inlineBlock: badge"]);

        deleteWith(KEY_DELETE_COMMAND);
        expect(shownBlocks()).toEqual([]);
        expect(twin.textContent).toBe("Beforeafter");
      });

      it("a click on its placeholder selects it and a Backspace removes it", async () => {
        start(stateOf(paragraph(text("Before")), BLOCK));

        const clicked = new MouseEvent("click", { bubbles: true, cancelable: true });
        twin.querySelector(`[${DATA_VE_OPAQUE_ATTR}]`)?.dispatchEvent(clicked);
        await flushMutations();
        expect(selectedBlocks()).toEqual(["block: callout"]);
        expect(changes).toEqual([]);

        deleteWith(KEY_BACKSPACE_COMMAND);
        expect(latest().root.children).toEqual([paragraph(text("Before"))]);
      });

      it("a Backspace at the start of the paragraph after it never deletes the text before it", () => {
        start(stateOf(paragraph(text("Before")), BLOCK, paragraph(text("After"))));
        update(() => ($getRoot().getLastChildOrThrow() as ElementNode).select(0, 0));

        deleteWith(KEY_BACKSPACE_COMMAND);

        expect(selectedBlocks()).toEqual(["block: callout"]);
        expect(changes).toEqual([]);
      });

      it("a Backspace in an empty paragraph after it removes the paragraph and selects it", () => {
        start(stateOf(paragraph(text("Before")), BLOCK, paragraph()));
        update(() => ($getRoot().getLastChildOrThrow() as ElementNode).select(0, 0));

        deleteWith(KEY_BACKSPACE_COMMAND);

        expect(latest().root.children).toEqual([paragraph(text("Before")), BLOCK]);
        expect(selectedBlocks()).toEqual(["block: callout"]);
      });

      it("leaves a paragraph for the caret when it was all the rich text held", () => {
        start(stateOf(BLOCK));
        selectNode(0);

        deleteWith(KEY_BACKSPACE_COMMAND);

        expect(typesOfRoot()).toEqual(["paragraph"]);
        expect(latest().root.children).toHaveLength(1);
      });

      it("comes back as it is stored on undo, and leaves again on redo", () => {
        start(stateOf(paragraph(text("Before")), BLOCK, OPAQUE_BLOCKS[3]![1]));
        selectNode(1);
        deleteWith(KEY_BACKSPACE_COMMAND);
        expect(shownBlocks()).toEqual(["horizontalrule"]);

        undo();
        expect(shownBlocks()).toEqual(["block: callout", "horizontalrule"]);
        expect(JSON.stringify(latest().root.children[1])).toBe(JSON.stringify(BLOCK));

        update(() => lexicalOf(twin).dispatchCommand(REDO_COMMAND, undefined));
        expect(shownBlocks()).toEqual(["horizontalrule"]);
      });

      it("is not removed by a cut while it is selected", () => {
        start(stateOf(paragraph(text("Before")), BLOCK));
        selectNode(1);
        const cut = new Event("cut", { cancelable: true }) as ClipboardEvent;

        update(() => lexicalOf(twin).dispatchCommand(CUT_COMMAND, cut));

        expect(cut.defaultPrevented).toBe(true);
        expect(shownBlocks()).toEqual(["block: callout"]);
        expect(changes).toEqual([]);
      });
    });

    describe("cannot be taken away", () => {
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

  describe("the caret", () => {
    const TWO_PARAGRAPHS = stateOf(
      paragraph(text("Hello "), text("world", BOLD)),
      OPAQUE_BLOCKS[0]![1],
      paragraph(text("After"))
    );

    it.each<[string, number, boolean, [string, number]]>([
      ["inside a text", 3, false, ["Hello ", 3]],
      ["inside a later text of the paragraph", 8, false, ["world", 2]],
      ["below a node the page cannot edit, whose text is not counted", 13, false, ["After", 2]],
      ["at the end of a paragraph", 11, false, ["world", 5]],
      ["at the start of the next paragraph", 11, true, ["After", 0]],
      ["at the very start", 0, true, ["Hello ", 0]],
      ["past the end of the text", 99, false, ["After", 5]],
    ])("is placed %s", (_name, offset, isAtStart, expected) => {
      start(TWO_PARAGRAPHS, EVERY_FORMAT, { caret: { isAtStart, offset } });

      expect(caret()).toEqual(expected);
    });

    it("is placed at the end when the click named no text", () => {
      start(TWO_PARAGRAPHS);

      expect(caret()).toEqual(["After", 5]);
    });
  });

  describe("a line break that ends a block", () => {
    const LINE_BREAK = { type: "linebreak", version: 1 };
    const ENDING_IN_A_BREAK = stateOf(
      element("list", [element("listitem", [text("Item"), LINE_BREAK], { value: 1 })], {
        listType: "bullet",
        start: 1,
        tag: "ul",
      }),
      paragraph(text("After"))
    );

    const addedLine = () =>
      twin.querySelector<HTMLElement>("li br[data-lexical-managed-linebreak]") as HTMLElement;

    const placeCaretAfterTheBreak = () =>
      update(() => {
        const item = $getRoot().getFirstDescendant()?.getParent();
        if ($isElementNode(item)) item.select(item.getChildrenSize(), item.getChildrenSize());
      });

    it("adds no line the site does not show", () => {
      start(ENDING_IN_A_BREAK);

      expect(addedLine()).not.toBeNull();
      expect(isShown(addedLine())).toBe(false);
      expect(isShown(twin.querySelector("li br:not([data-lexical-managed-linebreak])")!)).toBe(
        true
      );
    });

    it("shows the line once the caret is on it, so the editor sees where it types", () => {
      start(ENDING_IN_A_BREAK);

      placeCaretAfterTheBreak();

      expect(isShown(addedLine())).toBe(true);
    });

    it("hides the line again when the caret leaves it", () => {
      start(ENDING_IN_A_BREAK);
      placeCaretAfterTheBreak();

      select(1, 0, 0);

      expect(isShown(addedLine())).toBe(false);
    });

    it("keeps a line break inside a block as it is", () => {
      start(stateOf(paragraph(text("One"), LINE_BREAK, text("Two"))));

      expect(twin.querySelector("br[data-lexical-managed-linebreak]")).toBeNull();
      expect(isShown(twin.querySelector("br")!)).toBe(true);
    });
  });

  describe("spaces the site collapses", () => {
    const CODE = 16;
    const SPACED = stateOf(
      paragraph(text("  RT1    pop"), text("  end  ", BOLD)),
      paragraph(text("before "), { type: "linebreak", version: 1 }, text(" after")),
      paragraph(text("a  b", CODE))
    );

    const shownTexts = () => lexicalStateOf().root.children.map(textsOf);

    it("are shown collapsed, as the site shows them", () => {
      start(SPACED, EVERY_FORMAT, { rendered: renderedBy("<p>spaced</p>") });

      expect(shownTexts()).toEqual([["RT1 pop", " end"], ["before", undefined, "after"], ["a  b"]]);
    });

    it("are not reported as a change", () => {
      start(SPACED, EVERY_FORMAT, { rendered: renderedBy("<p>spaced</p>") });

      expect(changes).toEqual([]);
    });

    it("move the caret to the same place among the shown characters", () => {
      start(SPACED, EVERY_FORMAT, {
        caret: { isAtStart: false, offset: 12 },
        rendered: renderedBy("<p>spaced</p>"),
      });

      expect(caret()).toEqual(["RT1 pop", 7]);
    });

    it("are kept where the site keeps them", () => {
      start(SPACED, EVERY_FORMAT, {
        rendered: renderedBy('<p style="white-space: pre-wrap">spaced</p>'),
      });

      expect(shownTexts()[0]).toEqual(["  RT1    pop", "  end  "]);
    });

    it("are kept when nothing rendered tells how the site shows them", () => {
      start(SPACED);

      expect(shownTexts()[0]).toEqual(["  RT1    pop", "  end  "]);
    });

    it("break lines as the site breaks them", () => {
      start(SPACED, EVERY_FORMAT, {
        rendered: renderedBy('<p style="word-break: keep-all">spaced</p>'),
      });

      expect(twin.style.getPropertyValue("word-break")).toBe("keep-all");
    });
  });

  describe("the look of what the site rendered", () => {
    const RENDERED = `
      <h2 class="title">A heading</h2>
      <p class="lead">Hello <strong class="strong">world</strong> <em class="em">and</em>
        <u class="under">more</u> <a class="link" href="/docs">docs</a></p>
      <aside class="callout" id="callout" data-ve-path="blocks.0"><p class="inner">Rendered by the site</p></aside>
      <ul class="bullets"><li class="item">One</li><li class="item wrap"><ul class="nested"><li class="item">Deep</li></ul></li></ul>
      <blockquote class="quote">Said</blockquote>
    `;

    const STATE_OF_RENDERED = stateOf(
      heading("h2", text("A heading")),
      paragraph(
        text("Hello "),
        text("world", BOLD),
        text("and", 2),
        text("more", 8),
        storedLink("/docs", text("docs"))
      ),
      OPAQUE_BLOCKS[0]![1],
      element(
        "list",
        [
          element("listitem", [text("One")], { value: 1 }),
          element(
            "listitem",
            [
              element("list", [element("listitem", [text("Deep")], { value: 1 })], {
                listType: "bullet",
                start: 1,
                tag: "ul",
              }),
            ],
            { value: 2 }
          ),
        ],
        { listType: "bullet", start: 1, tag: "ul" }
      ),
      element("quote", [text("Said")])
    );

    const classIn = (selector: string) => twin.querySelector(selector)?.className;

    it("gives every kind of element the class the site gave the first one of that kind", () => {
      start(STATE_OF_RENDERED, EVERY_FORMAT, { rendered: renderedBy(RENDERED) });

      expect(
        ["h2", "p", "strong", "em", "a", "ul", "li", "li + li", "li ul", "blockquote"].map(classIn)
      ).toEqual([
        "title",
        "lead",
        "strong",
        "ve-rich-text-italic em",
        "link",
        "bullets",
        "item",
        "item wrap",
        "nested",
        "quote",
      ]);
      expect(twin.querySelector(".ve-rich-text-underline")?.className).toBe(
        "ve-rich-text-underline under"
      );
    });

    it("gives no class to a kind the site did not render", () => {
      start(STATE_OF_RENDERED, EVERY_FORMAT, { rendered: renderedBy("<p>Plain</p>") });

      expect(["h2", "p", "strong", "a", "ul", "li", "blockquote"].map(classIn)).toEqual([
        "",
        "",
        "",
        "",
        "",
        "",
        "",
      ]);
    });

    it("never takes a class from inside what the site rendered for a node the page cannot edit", () => {
      const rendered = renderedBy(RENDERED);
      rendered.querySelector("h2")?.remove();
      rendered.querySelector("p.lead")?.remove();

      start(stateOf(OPAQUE_BLOCKS[0]![1], paragraph(text("Next"))), EVERY_FORMAT, {
        rendered: renderedBy('<aside><p class="inner">Block</p></aside><p class="outer">Next</p>'),
      });

      expect(classIn(":scope > p")).toBe("outer");
    });

    it("shows a node the page cannot edit as an inert copy of what the site rendered for it", () => {
      start(STATE_OF_RENDERED, EVERY_FORMAT, { rendered: renderedBy(RENDERED) });

      const placeholder = twin.querySelector(`[${DATA_VE_OPAQUE_ATTR}]`) as HTMLElement;
      const copy = placeholder.firstElementChild as HTMLElement;
      expect(placeholder.contentEditable).toBe("false");
      expect(copy.tagName).toBe("ASIDE");
      expect(copy.className).toBe("callout");
      expect(copy.hasAttribute("inert")).toBe(true);
      expect(copy.textContent).toBe("Rendered by the site");
      expect(placeholder.querySelectorAll("[id], [data-ve-path]")).toHaveLength(0);
      expect(JSON.stringify(lexicalStateOf().root.children[2])).toContain('"kept"');
    });

    it("keeps the copy when the node is removed and comes back on undo", () => {
      start(STATE_OF_RENDERED, EVERY_FORMAT, { rendered: renderedBy(RENDERED) });
      update(() => {
        const selection = $createNodeSelection();
        selection.add(($getRoot().getChildAtIndex(2) as LexicalNode).getKey());
        $setSelection(selection);
      });
      deleteWith(KEY_BACKSPACE_COMMAND);
      expect(twin.querySelector("aside")).toBeNull();

      update(() => lexicalOf(twin).dispatchCommand(UNDO_COMMAND, undefined));

      expect(twin.querySelector("aside.callout")?.textContent).toBe("Rendered by the site");
    });

    it("shows the labelled box when the site rendered another number of elements than the state holds", () => {
      start(STATE_OF_RENDERED, EVERY_FORMAT, {
        rendered: renderedBy(`${RENDERED}<p>One more</p>`),
      });

      expect(placeholders()).toEqual([
        { isEditable: "false", name: "block: callout", shown: "block: callout" },
      ]);
    });

    it("measures as the rendered rich text does", () => {
      const HEIGHTS: Record<string, number> = {
        "ASIDE.callout": 84,
        "BLOCKQUOTE.quote": 40,
        "H2.title": 48,
        "LI.item": 28,
        "P.lead": 30,
      };
      const heightOf = (shown: Element): number => {
        const own = HEIGHTS[`${shown.tagName}.${shown.className}`];
        if (own !== undefined && shown.querySelector("li") === null) return own;
        return [...shown.children].reduce((height, child) => height + heightOf(child), own ?? 0);
      };
      const rendered = renderedBy(RENDERED);

      start(STATE_OF_RENDERED, EVERY_FORMAT, { rendered });

      expect(heightOf(rendered)).toBeGreaterThan(0);
      expect(Math.abs(heightOf(twin) - heightOf(rendered))).toBeLessThanOrEqual(1);
    });

    it("turns the spelling check off, as a text edit does", () => {
      start(STATE_OF_RENDERED);

      expect(twin.getAttribute("spellcheck")).toBe("false");
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

  describe("a block typed the way markdown writes it", () => {
    const typeAtTheStart = (typed: string, formats: VeRichTextFormats = EVERY_FORMAT) => {
      start(stateOf(paragraph(text("Title"))), formats);
      select(0, 0, 0);
      for (const character of typed) typeOver(character);
    };

    it.each<[string, string, object]>([
      ["## ", "heading", { tag: "h2" }],
      ["- ", "list", { listType: "bullet" }],
      ["1. ", "list", { listType: "number" }],
      ["> ", "quote", {}],
    ])("turns a paragraph that begins with %j into a %s", (typed, type, shape) => {
      typeAtTheStart(typed);

      expect(latest().root.children).toHaveLength(1);
      expect(latest().root.children[0]).toMatchObject({ type, ...shape });
      expect(twin.textContent).toBe("Title");
    });

    it("leaves the characters as text for a block the field does not allow", () => {
      typeAtTheStart("## ", { ...EVERY_FORMAT, headings: [] });

      expect(latest().root.children[0]).toMatchObject({ type: "paragraph" });
      expect(twin.textContent).toBe("## Title");
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

    it("is shown for as long as the edit runs, with and without selected text", () => {
      expect(isToolbarShown()).toBe(true);

      select(0, 0, 5);
      expect(isToolbarShown()).toBe(true);

      select(0, 2, 2);
      expect(isToolbarShown()).toBe(true);
    });

    describe("on a narrow screen", () => {
      const VIEWPORT = { innerHeight: 600, innerWidth: 390 };
      const TOOLBAR = { height: 90, width: 300 };
      const real = { innerHeight: window.innerHeight, innerWidth: window.innerWidth };

      const editAt = (rect: DOMRect) => {
        vi.spyOn(twin, "getBoundingClientRect").mockReturnValue(rect);
        vi.spyOn(toolbarHost(), "getBoundingClientRect").mockReturnValue(
          new DOMRect(0, 0, TOOLBAR.width, TOOLBAR.height)
        );
        select(0, 0, 5);
      };

      beforeEach(() => Object.assign(window, VIEWPORT));

      afterEach(() => {
        Object.assign(window, real);
        vi.restoreAllMocks();
      });

      it.each<[string, DOMRect, string]>([
        ["text at the right edge", new DOMRect(380, 300, 10, 200), "translate(82px, 202px)"],
        ["text at the left edge", new DOMRect(0, 300, 300, 200), "translate(8px, 202px)"],
        ["text at the top", new DOMRect(40, 4, 300, 200), "translate(40px, 8px)"],
        [
          "text that begins above the viewport",
          new DOMRect(40, -400, 300, 900),
          "translate(40px, 8px)",
        ],
        [
          "text that begins below the viewport",
          new DOMRect(40, 900, 300, 200),
          "translate(40px, 502px)",
        ],
      ])(
        "sits above the edited text and stays inside the viewport for %s",
        (_name, rect, transform) => {
          editAt(rect);

          expect(toolbarHost().style.transform).toBe(transform);
        }
      );

      it("is never wider than the viewport less its margin, and wraps its buttons", () => {
        const styles = toolbar().querySelector("style")?.textContent ?? "";

        expect(styles).toContain("max-width: calc(100vw - 16px)");
        expect(styles).toContain("flex-wrap: wrap");
        expect(linkInput().parentElement?.getAttribute("role")).toBe("toolbar");
        expect(button("bold").parentElement?.getAttribute("role")).toBe("group");
      });

      describe("on a page the site zoomed", () => {
        const PAGE_ZOOM = 1.25;

        beforeEach(() => zoomEveryElement(PAGE_ZOOM));

        afterEach(zoomNoElement);

        it.each<[string, DOMRect, string]>([
          ["text in the middle", new DOMRect(50, 348, 300, 200), "translate(40px, 200px)"],
          ["text at the right edge", new DOMRect(380, 348, 10, 200), "translate(65.6px, 200px)"],
          ["text at the top", new DOMRect(50, 4, 300, 200), "translate(40px, 6.4px)"],
        ])(
          "sits above the edited text where it is drawn, not where the zoom would move it again, for %s",
          (_name, rect, transform) => {
            editAt(rect);

            expect(toolbarHost().style.transform).toBe(transform);
          }
        );
      });
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

      it("says in words why an address is refused, where assistive technology announces it", () => {
        select(0, 0, 5);
        applyLink("ftp://files.example.com");

        const problem = toolbar().querySelector('[role="alert"]') as HTMLElement;
        expect(problem.hidden).toBe(false);
        expect(problem.textContent).toBe(
          "Use an address that starts with http:, https:, mailto: or tel:, or a relative one."
        );
        expect(linkInput().getAttribute("aria-describedby")).toBe(problem.id);

        linkInput().dispatchEvent(new Event("input"));

        expect(problem.hidden).toBe(true);
        expect(problem.textContent).toBe("");
        expect(linkInput().hasAttribute("aria-invalid")).toBe(false);
      });

      it.each(["Escape", "Enter"])(
        "puts the selection back that was there when the field opened, on %s",
        (key) => {
          select(0, 0, 5);
          button("link").click();
          linkInput().value = "/docs";
          update(() => $setSelection(null));

          pressInLinkInput(key);

          expect(selectedText()).toBe("Hello");
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

    it("asks to commit, never to cancel, when the editor fails after it started", () => {
      select(0, 6, 11);
      typeOver("there");

      update(() => {
        throw new Error("broken");
      });

      expect(onCommit).toHaveBeenCalledTimes(1);
      expect(onCancel).not.toHaveBeenCalled();
      expect(latest().root.children).toEqual([paragraph(text("Hello there"))]);
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
