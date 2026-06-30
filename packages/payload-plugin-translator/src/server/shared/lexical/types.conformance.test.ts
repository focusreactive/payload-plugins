import type {
  SerializedLexicalNode as PayloadLexicalNode,
  SerializedRootNode as PayloadRootNode,
  SerializedTextNode as PayloadTextNode,
} from "@payloadcms/richtext-lexical/lexical";
import { describe, expect, it } from "vitest";

// Conformance (compile-time, enforced by tsgo). The locally-owned Serialized* types must stay a
// structural SUPERTYPE of Payload's real serialized nodes, so the adapter keeps handing real
// richText data to this layer unchanged even though the layer no longer imports the framework.
import type { SerializedLexicalNode, SerializedRootNode, SerializedTextNode } from "./types";

const _node: SerializedLexicalNode = {} as PayloadLexicalNode;
const _text: SerializedTextNode = {} as PayloadTextNode;
const _root: SerializedRootNode = {} as PayloadRootNode;

void _node;
void _text;
void _root;

describe("local Serialized* types accept Payload's serialized nodes", () => {
  it("compiles (assignability checked by tsgo)", () => {
    expect(true).toBe(true);
  });
});
