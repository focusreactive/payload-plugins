/**
 * A block definition as this layer needs to read it: a `slug` to match a data element's
 * `blockType` against, and the child `fields` to descend into. Structurally a superset-compatible
 * shape of Payload's `Block` (Payload's concrete `Block` is assignable to this).
 *
 * @public
 */
export interface BlockLike {
  slug: string;
  fields: FieldLike[];
}

/**
 * A tab as this layer needs to read it: an optional `name` (present → it opens a data boundary;
 * absent → it flattens into the parent scope), its child `fields`, and `localized` (a *named* tab
 * may be `localized`, partitioning its subtree per locale — Payload's sanitizer propagates it the
 * same as a group). Payload's `Tab` (`NamedTab | UnnamedTab`) is assignable to this.
 *
 * @public
 */
export interface TabLike {
  name?: string;
  localized?: boolean;
  fields: FieldLike[];
}

/**
 * The structural shape of a single field this traversal layer reads — a framework-agnostic
 * superset that Payload's concrete `Field` union is assignable to. The layer only ever reads
 * `type` (to classify), `name`/`localized`/`custom` (leaf data + translation config), and the
 * container members `fields`/`blocks`/`tabs` (to descend). Nothing Payload-specific leaks in.
 *
 * @public
 */
export interface FieldLike {
  type: string;
  name?: string;
  localized?: boolean;
  custom?: Record<string, unknown>;
  fields?: FieldLike[];
  blocks?: BlockLike[];
  tabs?: TabLike[];
}

/**
 * A `group` field: a named data boundary whose child `fields` live one level down at `name`.
 *
 * @public
 */
export interface GroupFieldLike extends FieldLike {
  type: "group";
  name: string;
  fields: FieldLike[];
}

/**
 * An `array` field: a named, repeating data boundary. Its `fields` describe one element; the
 * data carries N elements keyed by index.
 *
 * @public
 */
export interface ArrayFieldLike extends FieldLike {
  type: "array";
  name: string;
  fields: FieldLike[];
}

/**
 * A `blocks` field: a named, polymorphic repeating boundary. Each element's child fields are
 * resolved per element by matching its `blockType` against `blocks[].slug`.
 *
 * @public
 */
export interface BlocksFieldLike extends FieldLike {
  type: "blocks";
  name: string;
  blocks: BlockLike[];
}

/**
 * A `tabs` field: carries `tabs` (not `fields`) and is non-data-affecting. Expand with
 * `tabScopes` into named/unnamed {@link TabScope}s.
 *
 * @public
 */
export interface TabsFieldLike extends FieldLike {
  type: "tabs";
  tabs: TabLike[];
}

/**
 * A data-affecting field the engine routes to `leaf`: a scalar/relational leaf, never a
 * container (`group`/`array`/`blocks`/`tabs`). The `never` guards on the container members are
 * what exclude containers — a `FieldLike` carrying `fields`/`blocks`/`tabs` is NOT assignable
 * here, so leaf dispatch can never silently widen onto a container, and `name` is always present.
 *
 * @public
 */
export interface LeafFieldLike {
  name: string;
  type: string;
  localized?: boolean;
  custom?: Record<string, unknown>;
  fields?: never;
  blocks?: never;
  tabs?: never;
}

/**
 * Back-compat alias for {@link LeafFieldLike}. Existing consumers (and `index.ts`) re-export
 * `LeafField`; the leaf is now defined structurally rather than as a narrowing of Payload's
 * `FieldAffectingData`.
 *
 * @public
 */
export type LeafField = LeafFieldLike;

/**
 * Structural classification of a single field — the one place that encodes
 * how field types map onto data boundaries (the dispatch order
 * `tabs → transparent → group → array → blocks → leaf`).
 *
 * Consumed by {@link FieldWalker}/`walkFields` (the exhaustive, data-parallel walks)
 * and by path-navigation; the four hand-rolled traversals collapse onto it so the
 * dispatch lives in exactly one place.
 *
 * - `transparent` — presentational container that does NOT open a data boundary
 *   (row, collapsible, unnamed group). Its `fields` live in the SAME data scope as
 *   the parent.
 * - `presentational` — a `ui` leaf: no data, no subfields.
 * - `group`/`array`/`blocks` — open a data boundary at `name`.
 * - `leaf` — a data-affecting field with no subfields.
 *
 * @see {@link classifyField} — produces this; {@link walkFields} — consumes it.
 * @public
 */
export type FieldStructure =
  | { kind: "tabs"; field: TabsFieldLike }
  | { kind: "transparent"; fields: FieldLike[] }
  | { kind: "presentational" }
  | { kind: "group"; name: string; fields: FieldLike[]; field: GroupFieldLike }
  | { kind: "array"; name: string; fields: FieldLike[]; field: ArrayFieldLike }
  | { kind: "blocks"; name: string; field: BlocksFieldLike }
  | { kind: "leaf"; name: string; field: LeafFieldLike };

/**
 * A tab flattened by `tabScopes`. A named tab opens a data boundary, so its {@link TabLike}
 * is surfaced (the walker passes it to `enterObject`, and `tab.name` is the data key).
 * An unnamed tab flattens into the parent data scope, so only its `fields` are needed.
 *
 * @see {@link tabScopes}
 * @public
 */
export type TabScope =
  | { named: true; tab: TabLike & { name: string } }
  | { named: false; fields: FieldLike[] };

/**
 * Control signal a walker callback can return instead of descending.
 * - `skip` — do not descend this branch; continue with siblings.
 * - `stop` — halt the whole walk (used for path-style navigation / early-exit).
 *
 * @public
 */
export type WalkSignal = "skip" | "stop";

/**
 * One child to recurse under an array/blocks boundary. The caller derives these from its own
 * data (it alone knows how many elements there are and their shape) and returns them from
 * {@link FieldWalker.enterList}.
 *
 * @template Cursor - The walker's data-position type (see {@link FieldWalker}).
 * @public
 */
export interface ChildCursor<Cursor extends object> {
  cursor: Cursor;
  /** Child fields to walk under this item. For `blocks`, the resolved `block.fields`. */
  fields: FieldLike[];
  /** Index/key this child sits at; surfaced back to `combine`. */
  key: string | number;
}

/**
 * The container the engine asks the walker to assemble, bottom-up.
 *
 * - `root` — the top-level field list (`field` is `null`).
 * - `object` — a `group` or a named tab.
 * - `list` — an `array` or `blocks` collection (children are its elements, keyed by index).
 * - `element` — a single element of a list (children are its fields). `field` is the
 *   parent list field; distinguish array vs blocks via `field.type`.
 *
 * @see {@link FieldWalker.combine}
 * @public
 */
export type ContainerInfo =
  | { kind: "root"; field: null }
  | { kind: "object"; field: GroupFieldLike | (TabLike & { name: string }); key: string }
  | { kind: "list"; field: ArrayFieldLike | BlocksFieldLike; key: string }
  | { kind: "element"; field: ArrayFieldLike | BlocksFieldLike; key: string | number };

/**
 * A child's assembled output, tagged with the key it sat at within its parent. Passed to
 * {@link FieldWalker.combine} as the `children` list.
 *
 * @template Out - The walker's per-node output type (see {@link FieldWalker}).
 * @public
 */
export interface ChildOutput<Out> {
  key: string | number;
  out: Out;
}

/**
 * Behaviour a caller plugs into {@link walkFields}. The engine owns structural dispatch and
 * recursion over the **schema**; the caller owns the **data** via the opaque `Cursor`
 * (1..n parallel data trees plus any path live there) and decides what to produce.
 *
 * Shapes this is designed to subsume (one engine, many callers):
 * - build-tree (filter / reconcile) — reconstruct values in `combine`.
 * - collect + mutate (field-chunk collector) — push/mutate in `leaf`, `combine` is a no-op.
 * - navigate + early-exit (path resolver) — `enter*` returns `'skip'`/`'stop'`.
 *
 * @template Cursor - The data position threaded through the walk. The engine never reads it;
 * it only passes it to your callbacks and stores the cursors you return. Constrained to
 * `object` so a cursor can never collide with a {@link WalkSignal} string (`'skip'`/`'stop'`).
 * @template Out - What you produce per leaf and assemble per container. Use `void` for a
 * collect-only walk (accumulate in a closure, return `undefined` from `combine`).
 *
 * @example
 * A collect-only walker that records the path of every localized leaf:
 * ```ts
 * type Cursor = { data: Record<string, unknown>; path: string[] };
 * const found: string[] = [];
 *
 * const walker: FieldWalker<Cursor, void> = {
 *   enterObject: (field, c) =>
 *     isRecord(c.data[field.name])
 *       ? { data: c.data[field.name], path: [...c.path, field.name] }
 *       : "skip",
 *   enterList: (field, c) => toItemCursors(field, c),
 *   leaf: (field, c) => {
 *     if (field.localized) found.push([...c.path, field.name].join("."));
 *     return undefined;
 *   },
 *   combine: () => undefined, // collect-only: nothing to assemble
 * };
 * ```
 *
 * @see {@link walkFields}
 * @public
 */
export interface FieldWalker<Cursor extends object, Out> {
  /** Enter a single-object boundary (named `group` or named tab). Return the child cursor, or a signal. */
  enterObject(
    field: GroupFieldLike | (TabLike & { name: string }),
    cursor: Cursor
  ): Cursor | WalkSignal;
  /** Enter an `array`/`blocks` boundary. Return one {@link ChildCursor} per element, or a signal. */
  enterList(
    field: ArrayFieldLike | BlocksFieldLike,
    cursor: Cursor
  ): ChildCursor<Cursor>[] | WalkSignal;
  /**
   * Visit a data-affecting leaf. `field` is a {@link LeafFieldLike} — the engine has already
   * resolved it via the `fieldAffectsData` guard and excluded containers/tabs, so `field.name`
   * is always present and callers never touch the raw field union. Return its output, or
   * `undefined` to drop it.
   */
  leaf(field: LeafFieldLike, cursor: Cursor): Out | undefined;
  /**
   * Assemble a container from its children's outputs (called bottom-up). Build-tree
   * callers reconstruct here; collectors return `undefined`. Return `undefined` to drop
   * the container from its parent (e.g. an empty object after filtering).
   */
  combine(container: ContainerInfo, children: ChildOutput<Out>[], cursor: Cursor): Out | undefined;
}
