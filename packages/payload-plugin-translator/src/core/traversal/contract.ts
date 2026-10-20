/**
 * The traversal contract: everything a host implements to have its content walked, and everything
 * the kernel promises back.
 *
 * The kernel never reads content. A {@link Language} does, because only a language knows both its
 * own structure vocabulary and its own data layout.
 */

/**
 * One token of a leaf's address.
 *
 * A number is not necessarily a position: a language emits whatever identifies the node durably,
 * so an element may be addressed by its id (a string) or, when it has none, by where it sat (a
 * number). Do not read meaning into which one arrives.
 *
 * @public
 */
export type PathSegment = string | number;

/**
 * What one node adds to a leaf's address, outermost first.
 *
 * Empty for a node that groups others without opening a level of its own. More than one for a node
 * that opens several at once — a keyed collection contributes its own name and then the identity of
 * the element being entered.
 *
 * @public
 */
export type PathSegments = readonly PathSegment[];

/**
 * A leaf's address: every token contributed on the way to it, outermost first, across every
 * language the walk passed through.
 *
 * It is **not** unique across a result. A leaf whose language cuts it into several
 * {@link TextUnit}s produces one {@link TranslationTarget} per unit, all sharing this address.
 *
 * @public
 */
export type IdPath = readonly PathSegment[];

/**
 * One group of sibling nodes to descend into, with the cursor that goes with them.
 *
 * @template N - the language's node type.
 * @template C - the language's cursor type.
 * @public
 */
export type StepChild<N, C> = {
  /** The nodes to walk next. An empty list descends nowhere and is not an error. */
  nodes: readonly N[];
  /** The position these nodes are read at. The kernel passes it back untouched. */
  cursor: C;
  /** What this descent adds to the address of everything below it. */
  segments: PathSegments;
};

/**
 * What one node turns into when its language looks at it.
 *
 * The three node kinds are this shape rather than a tag of their own: one child group is an object,
 * several are a list, none is a value.
 *
 * @template N - the language's node type.
 * @template C - the language's cursor type.
 * @public
 */
export type Step<N, C> =
  | {
      /** This node opens onto others. Nothing here is translated; its children are. */
      kind: "children";
      /** Walked in the order given; that order is the order of the result. */
      items: ReadonlyArray<StepChild<N, C>>;
    }
  | {
      /** Content lives here. This is the only shape a boundary or a translation can come from. */
      kind: "value";
      /** Handed to {@link Language.boundary}, {@link Language.isEmpty} and {@link Language.textUnits} unchanged. */
      value: unknown;
      /** What this leaf adds to its own address. */
      segments: PathSegments;
      /**
       * How to put a value back where this one came from. Absent when the position cannot be
       * written — a read-only walk, or a copy this language does not own — and a leaf with no
       * `setValue` can still be crossed into, but yields no writable text.
       */
      setValue?: (value: unknown) => void;
    }
  | {
      /** This node holds nothing to walk and nothing to translate. Its siblings continue. */
      kind: "skip";
    };

/**
 * A value position offered to {@link Language.textUnits}.
 *
 * @public
 */
export type TextLeaf = {
  /** The value this language's {@link Language.step} produced for the position. */
  value: unknown;
  /** Present only when the position can be written; see {@link Step}. */
  setValue?: (value: unknown) => void;
};

/**
 * One translatable piece of text, with the way to put its translation back.
 *
 * @public
 */
export type TextUnit = {
  /** Sent for translation exactly as given, including surrounding whitespace. */
  text: string;
  /**
   * Called by {@link applyTranslations}, at most once, with the answer for this unit. A unit whose
   * answer is withheld is never called. The kernel never calls it for any other reason.
   */
  write: (translated: string) => void;
};

/**
 * How a language is activated — at the root of a walk and at every boundary alike.
 *
 * A language that hands content on takes its successor's crossing from the context it was itself
 * handed, never from a literal id: nothing tells a language who activated it, and nothing should,
 * or the same language could not serve two different hosts.
 *
 * @public
 */
export type Crossing = {
  /**
   * Which language takes over. Must be the {@link Language.id} of one of the languages passed to
   * the walk, or {@link UnknownLanguageError} is thrown at the moment of crossing.
   */
  languageId: string;
  /**
   * Whatever that language needs to start. Opaque to the kernel, which neither reads nor copies it,
   * and the **only** channel by which anything reaches {@link Language.enter}.
   */
  context: unknown;
};

/**
 * One kind of nested structure that can be walked, plus how it reads and writes text at its own
 * leaves and where it hands content to another language.
 *
 * Implement this to teach the kernel a content format. The kernel ships none.
 *
 * @template N - this language's node type. Only nodes this language itself produced are ever
 *   passed back to it, so an implementation may trust the type without re-checking it.
 * @template C - this language's cursor: wherever it keeps its position in the data, plus anything
 *   that arrived with its activation context. It is the only way that context reaches
 *   {@link Language.step} and {@link Language.boundary}, which never receive the context itself.
 * @public
 */
export type Language<N, C> = {
  /**
   * Identifies this language in a {@link Crossing}. Two languages registered under one id are a
   * {@link DuplicateLanguageError}.
   */
  id: string;

  /**
   * Build the nodes and cursor this activation walks — or refuse the context.
   *
   * @param args.value - the value of the leaf that crossed into this language. Absent when this
   *   language is the walk's entry point, because there is no leaf behind it.
   * @param args.context - whatever the {@link Crossing} carried.
   * @returns the nodes to walk and the cursor to walk them with, or `null` to say the context is
   *   not this language's. The two are different answers: `null` raises
   *   {@link CannotEnterLanguageError}, and a throw from inside `enter` raises the same error with
   *   the original on `cause`; `{ nodes: [], cursor }` is a complete, valid answer meaning there is
   *   nothing here to walk.
   */
  enter(args: { value?: unknown; context: unknown }): { nodes: readonly N[]; cursor: C } | null;

  /**
   * Say what this node is: children to descend into, a value, or nothing.
   *
   * @param node - one of the nodes this language produced.
   * @param cursor - the position those nodes are read at.
   */
  step(node: N, cursor: C): Step<N, C>;

  /**
   * Whether this node is a translation target at all, in this language's own vocabulary.
   *
   * Consulted only for a value step that is not a boundary, and **after** {@link Language.boundary}
   * has declined — so a node whose content belongs to another language is never asked.
   */
  selects(node: N, cursor: C): boolean;

  /**
   * Whether a value of this language holds nothing worth sending.
   *
   * Consulted after {@link Language.selects} and before {@link Language.textUnits}. An empty value
   * yields no target and is **not** reported through `onSelectedWithoutText`: empty is an answer,
   * not a gap.
   */
  isEmpty(value: unknown): boolean;

  /**
   * Cut this leaf into the pieces that will be translated.
   *
   * How a leaf is cut is this language's own choice, and may be fixed when the language is built:
   * a rich text can offer one unit per text node, or the whole container as a single unit carrying
   * its own formatting. The kernel does not choose, and nothing in it depends on which was chosen.
   *
   * @returns zero or more units, in the order they should be sent. Returning none for a leaf that
   *   {@link Language.selects} accepted and {@link Language.isEmpty} rejected is reported through
   *   the walk's `onSelectedWithoutText`, so a value nobody can read is visible rather than silent.
   */
  textUnits(leaf: TextLeaf): TextUnit[];

  /**
   * Declare that this value's content belongs to another language.
   *
   * Consulted **first**, for every value step, before selection. Returning a crossing hands the
   * value on and this language's `selects`, `isEmpty` and `textUnits` are not called for it;
   * returning `null` means the value is this language's own leaf.
   *
   * Required rather than optional, so that `return null` is a statement — "nothing inside me is
   * written in another language" — instead of being indistinguishable from forgetting. A language
   * that can hold embedded content and omits this translates its own prose and silently leaves
   * everything embedded in it untranslated.
   *
   * Because it is consulted before selection, a language that only translates part of its content
   * must apply that rule here too — otherwise it crosses into content its host never marked.
   */
  boundary(node: N, cursor: C, value: unknown): Crossing | null;
};

/**
 * A language as a walk holds it, with its own node and cursor types forgotten.
 *
 * Any `Language<N, C>` is assignable here. The widening is safe for how the kernel uses it: it only
 * ever returns a language the nodes and cursor that language itself produced.
 *
 * @public
 */
export type RegisteredLanguage = Language<unknown, unknown>;

/**
 * One piece of text found by a walk, and the way to write its translation back.
 *
 * @public
 */
export type TranslationTarget = {
  /**
   * Where this text was found. **Not unique** — a leaf cut into several units yields one target per
   * unit, all carrying this same address.
   */
  idPath: IdPath;
  /** The text to translate, exactly as its language produced it. */
  text: string;
  /** This unit's {@link TextUnit.write}; calling it writes into the walked content. */
  write: (translated: string) => void;
};
