import { describe, it, expect } from "vitest";
import { collectInlineFragments } from "./collectInlineFragments";

const createNode = (type: string, props?: Record<string, any>, children?: any[]) =>
  ({ type, ...props, ...(children && { children }) }) as any;

const childrenOf = (node: unknown): unknown[] =>
  ((node as { children?: unknown[] }).children ?? []) as unknown[];

describe("collectInlineFragments", () => {
  describe("finding the container", () => {
    it("takes the paragraph as the container when it has direct text children", () => {
      const root = createNode("root", {}, [
        createNode("paragraph", {}, [
          createNode("text", { text: "Buy " }),
          createNode("link", { url: "https://example.com" }, [
            createNode("text", { text: "our product" }),
          ]),
          createNode("text", { text: " today" }),
        ]),
      ]);

      expect(collectInlineFragments(root)).toHaveLength(1);
    });

    it("returns the container node itself, the one whose children the caller rebuilds", () => {
      const paragraph = createNode("paragraph", {}, [
        createNode("text", { text: "Buy " }),
        createNode("text", { text: "now" }),
      ]);
      const root = createNode("root", {}, [paragraph]);

      expect(collectInlineFragments(root)[0]?.node).toBe(paragraph);
    });

    it("does not visit a container's nested wrapper as a container of its own", () => {
      const link = createNode("link", { url: "https://example.com" }, [
        createNode("text", { text: "our product" }),
      ]);
      const root = createNode("root", {}, [
        createNode("paragraph", {}, [createNode("text", { text: "Buy " }), link]),
      ]);

      const containers = collectInlineFragments(root);

      expect(containers.some((container) => container.node === link)).toBe(false);
    });

    it("returns containers in document order", () => {
      const first = createNode("paragraph", {}, [createNode("text", { text: "First" })]);
      const second = createNode("paragraph", {}, [createNode("text", { text: "Second" })]);
      const root = createNode("root", {}, [first, second]);

      expect(collectInlineFragments(root).map((container) => container.node)).toEqual([
        first,
        second,
      ]);
    });

    it("takes each list item as its own container", () => {
      const firstItem = createNode("listitem", {}, [createNode("text", { text: "first" })]);
      const secondItem = createNode("listitem", {}, [createNode("text", { text: "second" })]);
      const root = createNode("root", {}, [createNode("list", {}, [firstItem, secondItem])]);

      expect(collectInlineFragments(root).map((container) => container.node)).toEqual([
        firstItem,
        secondItem,
      ]);
    });

    it("takes a quote's paragraph as the container, not the quote", () => {
      const paragraph = createNode("paragraph", {}, [createNode("text", { text: "quoted" })]);
      const root = createNode("root", {}, [createNode("quote", {}, [paragraph])]);

      expect(collectInlineFragments(root).map((container) => container.node)).toEqual([paragraph]);
    });

    it("yields no container for a node with no text children at all", () => {
      const root = createNode("root", {}, [
        createNode("paragraph", {}, [createNode("upload", { relationTo: "media" })]),
      ]);

      expect(collectInlineFragments(root)).toEqual([]);
    });

    it("walks past a block that carries fields instead of children", () => {
      const first = createNode("paragraph", {}, [createNode("text", { text: "before" })]);
      const second = createNode("paragraph", {}, [createNode("text", { text: "after" })]);
      const root = createNode("root", {}, [
        first,
        createNode("block", { fields: { blockType: "cta", label: "Buy" } }),
        second,
      ]);

      expect(collectInlineFragments(root).map((container) => container.node)).toEqual([
        first,
        second,
      ]);
    });

    it("returns no containers for an empty root", () => {
      expect(collectInlineFragments(createNode("root", {}, []))).toEqual([]);
    });

    it("makes each link its own container in a paragraph of adjacent links", () => {
      const firstLink = createNode("link", { url: "https://a.example" }, [
        createNode("text", { text: "first link" }),
      ]);
      const secondLink = createNode("link", { url: "https://b.example" }, [
        createNode("text", { text: "second link" }),
      ]);
      const root = createNode("root", {}, [createNode("paragraph", {}, [firstLink, secondLink])]);

      expect(collectInlineFragments(root).map((container) => container.node)).toEqual([
        firstLink,
        secondLink,
      ]);
    });

    it("gives each link container in that paragraph a single fragment", () => {
      const root = createNode("root", {}, [
        createNode("paragraph", {}, [
          createNode("link", { url: "https://a.example" }, [
            createNode("text", { text: "first link" }),
          ]),
          createNode("link", { url: "https://b.example" }, [
            createNode("text", { text: "second link" }),
          ]),
        ]),
      ]);

      expect(collectInlineFragments(root).map((container) => container.fragments.length)).toEqual([
        1, 1,
      ]);
    });

    it("sends each link container in that paragraph down the per-node path", () => {
      const root = createNode("root", {}, [
        createNode("paragraph", {}, [
          createNode("link", { url: "https://a.example" }, [
            createNode("text", { text: "first link" }),
          ]),
          createNode("link", { url: "https://b.example" }, [
            createNode("text", { text: "second link" }),
          ]),
        ]),
      ]);

      expect(collectInlineFragments(root).every((container) => container.skip !== undefined)).toBe(
        true
      );
    });
  });

  describe("fragments", () => {
    it("numbers fragments from 1 in document order within the container", () => {
      const root = createNode("root", {}, [
        createNode("paragraph", {}, [
          createNode("text", { text: "a " }),
          createNode("text", { text: "red" }),
          createNode("text", { text: " car" }),
        ]),
      ]);

      expect(collectInlineFragments(root)[0]?.fragments.map((piece) => piece.markId)).toEqual([
        1, 2, 3,
      ]);
    });

    it("restarts numbering at 1 in the next container", () => {
      const root = createNode("root", {}, [
        createNode("paragraph", {}, [
          createNode("text", { text: "a " }),
          createNode("text", { text: "red" }),
        ]),
        createNode("paragraph", {}, [
          createNode("text", { text: "a " }),
          createNode("text", { text: "blue" }),
        ]),
      ]);

      expect(collectInlineFragments(root)[1]?.fragments.map((piece) => piece.markId)).toEqual([
        1, 2,
      ]);
    });

    it("takes the fragment text from the leaf itself", () => {
      const root = createNode("root", {}, [
        createNode("paragraph", {}, [
          createNode("text", { text: "Buy " }),
          createNode("link", { url: "https://example.com" }, [
            createNode("text", { text: "our product" }),
          ]),
          createNode("text", { text: " today" }),
        ]),
      ]);

      expect(collectInlineFragments(root)[0]?.fragments.map((piece) => piece.text)).toEqual([
        "Buy ",
        "our product",
        " today",
      ]);
    });

    it("points a direct text leaf's node at that very leaf", () => {
      const leaf = createNode("text", { text: "Buy " });
      const root = createNode("root", {}, [
        createNode("paragraph", {}, [leaf, createNode("text", { text: "now" })]),
      ]);

      expect(collectInlineFragments(root)[0]?.fragments[0]?.node).toBe(leaf);
    });

    it("uses the same node as top for a direct text leaf", () => {
      const root = createNode("root", {}, [
        createNode("paragraph", {}, [
          createNode("text", { text: "Buy " }),
          createNode("text", { text: "now" }),
        ]),
      ]);

      const fragment = collectInlineFragments(root)[0]?.fragments[0];

      expect(fragment?.top).toBe(fragment?.node);
    });

    it("uses the container's direct child as top when that wrapper holds one leaf", () => {
      const link = createNode("link", { url: "https://example.com" }, [
        createNode("text", { text: "our product" }),
      ]);
      const root = createNode("root", {}, [
        createNode("paragraph", {}, [createNode("text", { text: "Buy " }), link]),
      ]);

      expect(collectInlineFragments(root)[0]?.fragments[1]?.top).toBe(link);
    });

    it("points node at the leaf inside a single-leaf wrapper", () => {
      const leaf = createNode("text", { text: "our product" });
      const root = createNode("root", {}, [
        createNode("paragraph", {}, [
          createNode("text", { text: "Buy " }),
          createNode("link", { url: "https://example.com" }, [leaf]),
        ]),
      ]);

      expect(collectInlineFragments(root)[0]?.fragments[1]?.node).toBe(leaf);
    });

    it("keeps a wrapper chain above the leaf inside top rather than rebuilding it", () => {
      const mark = createNode("mark", {}, [
        createNode("link", { url: "https://example.com" }, [
          createNode("text", { text: "our product" }),
        ]),
      ]);
      const root = createNode("root", {}, [
        createNode("paragraph", {}, [createNode("text", { text: "Buy " }), mark]),
      ]);

      expect(collectInlineFragments(root)[0]?.fragments[1]?.top).toBe(mark);
    });

    const linkWithTwoLeaves = () => {
      const emphasised = createNode("text", { text: "docs", format: 1 });
      const plain = createNode("text", { text: "read the " });
      const link = createNode("link", { url: "https://example.com" }, [plain, emphasised]);
      const root = createNode("root", {}, [
        createNode("paragraph", {}, [createNode("text", { text: "Please " }), link]),
      ]);
      return { root, link, plain, emphasised };
    };

    it("emits one fragment per leaf of a multi-leaf wrapper", () => {
      const { root } = linkWithTwoLeaves();

      expect(collectInlineFragments(root)[0]?.fragments).toHaveLength(3);
    });

    it("gives a multi-leaf wrapper's fragment a copy of the wrapper as top, not the wrapper", () => {
      const { root, link } = linkWithTwoLeaves();

      expect(collectInlineFragments(root)[0]?.fragments[1]?.top).not.toBe(link);
    });

    it("gives each leaf of a multi-leaf wrapper its own separate copy", () => {
      const { root } = linkWithTwoLeaves();

      const fragments = collectInlineFragments(root)[0]?.fragments ?? [];

      expect(fragments[1]?.top).not.toBe(fragments[2]?.top);
    });

    it("puts only this fragment's leaf inside the wrapper copy", () => {
      const { root } = linkWithTwoLeaves();

      const fragment = collectInlineFragments(root)[0]?.fragments[1];

      expect(childrenOf(fragment?.top)).toHaveLength(1);
    });

    it("points node into the wrapper copy, not at the source leaf", () => {
      const { root } = linkWithTwoLeaves();

      const fragment = collectInlineFragments(root)[0]?.fragments[1];

      expect(childrenOf(fragment?.top)[0]).toBe(fragment?.node);
    });

    const lineBreakMidParagraph = () => {
      const lineBreak = createNode("linebreak");
      const root = createNode("root", {}, [
        createNode("paragraph", {}, [
          createNode("text", { text: "first line" }),
          lineBreak,
          createNode("text", { text: "second line" }),
        ]),
      ]);
      return { root, lineBreak };
    };

    it("gives a node carrying no text a null text", () => {
      const { root } = lineBreakMidParagraph();

      expect(collectInlineFragments(root)[0]?.fragments[1]?.text).toBeNull();
    });

    it("gives a node carrying no text a null node", () => {
      const { root } = lineBreakMidParagraph();

      expect(collectInlineFragments(root)[0]?.fragments[1]?.node).toBeNull();
    });

    it("uses the text-free node itself as top", () => {
      const { root, lineBreak } = lineBreakMidParagraph();

      expect(collectInlineFragments(root)[0]?.fragments[1]?.top).toBe(lineBreak);
    });

    it("still numbers a fragment that carries no text", () => {
      const { root } = lineBreakMidParagraph();

      expect(collectInlineFragments(root)[0]?.fragments.map((piece) => piece.markId)).toEqual([
        1, 2, 3,
      ]);
    });
  });

  describe("whitespace-only nodes", () => {
    const spaceBetweenWords = () => {
      const buy = createNode("text", { text: "Buy" });
      const space = createNode("text", { text: " " });
      const root = createNode("root", {}, [
        createNode("paragraph", {}, [
          buy,
          space,
          createNode("link", { url: "https://example.com" }, [
            createNode("text", { text: "our product" }),
          ]),
        ]),
      ]);
      return { root, buy, space };
    };

    it("whitespace: a whitespace-only node becomes no fragment of its own", () => {
      const { root } = spaceBetweenWords();

      expect(collectInlineFragments(root)[0]?.fragments).toHaveLength(2);
    });

    it("whitespace: its text is glued onto the preceding fragment", () => {
      const { root } = spaceBetweenWords();

      expect(collectInlineFragments(root)[0]?.fragments[0]?.text).toBe("Buy ");
    });

    it("whitespace: its node drops out of the fragments", () => {
      const { root, space } = spaceBetweenWords();

      const fragments = collectInlineFragments(root)[0]?.fragments ?? [];

      expect(fragments.some((piece) => piece.node === space || piece.top === space)).toBe(false);
    });

    it("whitespace: the fragment it was glued onto keeps its own leaf as node", () => {
      const { root, buy } = spaceBetweenWords();

      expect(collectInlineFragments(root)[0]?.fragments[0]?.node).toBe(buy);
    });

    it("whitespace: numbering leaves no gap where the dropped node was", () => {
      const { root } = spaceBetweenWords();

      expect(collectInlineFragments(root)[0]?.fragments.map((piece) => piece.markId)).toEqual([
        1, 2,
      ]);
    });

    it("whitespace: glues backwards past a text-free fragment", () => {
      const root = createNode("root", {}, [
        createNode("paragraph", {}, [
          createNode("text", { text: "Hello" }),
          createNode("linebreak"),
          createNode("text", { text: " " }),
          createNode("text", { text: "World" }),
        ]),
      ]);

      const fragments = collectInlineFragments(root)[0]?.fragments;

      expect(fragments?.map((fragment) => fragment.text)).toEqual(["Hello ", null, "World"]);
    });

    it("whitespace: does not lose trailing glue after a text-free fragment", () => {
      const root = createNode("root", {}, [
        createNode("paragraph", {}, [
          createNode("text", { text: "Hello" }),
          createNode("linebreak"),
          createNode("text", { text: " " }),
        ]),
      ]);

      const fragments = collectInlineFragments(root)[0]?.fragments;

      expect(fragments?.map((fragment) => fragment.text)).toEqual(["Hello ", null]);
    });

    it("whitespace: with no preceding fragment it is glued onto the following one", () => {
      const root = createNode("root", {}, [
        createNode("paragraph", {}, [
          createNode("text", { text: " " }),
          createNode("link", { url: "https://example.com" }, [
            createNode("text", { text: "our product" }),
          ]),
          createNode("text", { text: " today" }),
        ]),
      ]);

      expect(collectInlineFragments(root)[0]?.fragments[0]?.text).toBe(" our product");
    });
  });

  describe("containers that cannot use marks", () => {
    it("mark-shaped: an opening-shaped sequence in the source skips the container", () => {
      const root = createNode("root", {}, [
        createNode("paragraph", {}, [
          createNode("text", { text: "the <12> sequence " }),
          createNode("link", { url: "https://example.com" }, [
            createNode("text", { text: "explained" }),
          ]),
        ]),
      ]);

      expect(collectInlineFragments(root)[0]?.skip).toBe("mark-shaped-source");
    });

    it("mark-shaped: a closing-shaped sequence in the source skips the container", () => {
      const root = createNode("root", {}, [
        createNode("paragraph", {}, [
          createNode("text", { text: "the </12> sequence " }),
          createNode("link", { url: "https://example.com" }, [
            createNode("text", { text: "explained" }),
          ]),
        ]),
      ]);

      expect(collectInlineFragments(root)[0]?.skip).toBe("mark-shaped-source");
    });

    it("mark-shaped: a self-closing-shaped sequence in the source skips the container", () => {
      const root = createNode("root", {}, [
        createNode("paragraph", {}, [
          createNode("text", { text: "the <12/> sequence " }),
          createNode("link", { url: "https://example.com" }, [
            createNode("text", { text: "explained" }),
          ]),
        ]),
      ]);

      expect(collectInlineFragments(root)[0]?.skip).toBe("mark-shaped-source");
    });

    it("mark-shaped: a skipped container still carries its fragments", () => {
      const root = createNode("root", {}, [
        createNode("paragraph", {}, [
          createNode("text", { text: "the <12> sequence " }),
          createNode("link", { url: "https://example.com" }, [
            createNode("text", { text: "explained" }),
          ]),
        ]),
      ]);

      expect(collectInlineFragments(root)[0]?.fragments).toHaveLength(2);
    });

    it("mark-shaped: a plain tag like <div> is not mark-shaped", () => {
      const root = createNode("root", {}, [
        createNode("paragraph", {}, [
          createNode("text", { text: "wrap it in " }),
          createNode("link", { url: "https://example.com" }, [
            createNode("text", { text: "<div>" }),
          ]),
        ]),
      ]);

      expect(collectInlineFragments(root)[0]?.skip).toBeUndefined();
    });

    it("mark-shaped: a comparison like 5 < 10 is not mark-shaped", () => {
      const root = createNode("root", {}, [
        createNode("paragraph", {}, [
          createNode("text", { text: "5 < 10 is " }),
          createNode("link", { url: "https://example.com" }, [
            createNode("text", { text: "always true" }),
          ]),
        ]),
      ]);

      expect(collectInlineFragments(root)[0]?.skip).toBeUndefined();
    });

    it("skips a container that is one plain text leaf", () => {
      const root = createNode("root", {}, [
        createNode("paragraph", {}, [createNode("text", { text: "A plain paragraph." })]),
      ]);

      expect(collectInlineFragments(root)[0]?.skip).toBe("single-leaf");
    });

    it("does not skip a container holding more than one fragment", () => {
      const root = createNode("root", {}, [
        createNode("paragraph", {}, [
          createNode("text", { text: "Buy " }),
          createNode("link", { url: "https://example.com" }, [
            createNode("text", { text: "our product" }),
          ]),
        ]),
      ]);

      expect(collectInlineFragments(root)[0]?.skip).toBeUndefined();
    });
  });

  describe("the source tree", () => {
    it("leaves the input tree untouched", () => {
      const root = createNode("root", {}, [
        createNode("paragraph", {}, [
          createNode("text", { text: "Buy" }),
          createNode("text", { text: " " }),
          createNode("link", { url: "https://example.com" }, [
            createNode("text", { text: "our product" }),
          ]),
          createNode("linebreak"),
          createNode("text", { text: " today" }),
        ]),
      ]);
      const before = JSON.parse(JSON.stringify(root));

      const containers = collectInlineFragments(root);

      // The positive half matters: an implementation that collected nothing would leave the
      // tree untouched too, and pass a check that only compared before and after.
      expect(containers[0]?.fragments).toHaveLength(4);
      expect(root).toEqual(before);
    });

    it("leaves the input tree untouched when a wrapper has to be copied", () => {
      const root = createNode("root", {}, [
        createNode("paragraph", {}, [
          createNode("text", { text: "Please " }),
          createNode("link", { url: "https://example.com" }, [
            createNode("text", { text: "read the " }),
            createNode("text", { text: "docs", format: 1 }),
          ]),
        ]),
      ]);
      const before = JSON.parse(JSON.stringify(root));

      const containers = collectInlineFragments(root);

      // Length assertion as above: without it a collector returning [] would pass this test.
      expect(containers[0]?.fragments).toHaveLength(3);
      expect(containers[0]?.fragments[1]?.top).not.toBe(
        (root as { children: { children: unknown[] }[] }).children[0]?.children[1]
      );
      expect(root).toEqual(before);
    });
  });

  describe("wrapper shapes the copy cannot carry", () => {
    it("wrapper: skips a container whose multi-leaf wrapper holds a node the copy would drop", () => {
      const root = createNode("root", {}, [
        createNode("paragraph", {}, [
          createNode("text", { text: "See " }),
          createNode("link", { url: "/docs" }, [
            createNode("text", { text: "read the " }),
            createNode("linebreak"),
            createNode("text", { text: "docs", format: 1 }),
          ]),
        ]),
      ]);

      expect(collectInlineFragments(root)[0]?.skip).toBe("unsupported-wrapper");
    });

    it("wrapper: a multi-leaf wrapper with only text inside is still handled", () => {
      const root = createNode("root", {}, [
        createNode("paragraph", {}, [
          createNode("text", { text: "See " }),
          createNode("link", { url: "/docs" }, [
            createNode("text", { text: "read the " }),
            createNode("text", { text: "docs", format: 1 }),
          ]),
        ]),
      ]);

      expect(collectInlineFragments(root)[0]?.skip).toBeUndefined();
    });
  });
});
