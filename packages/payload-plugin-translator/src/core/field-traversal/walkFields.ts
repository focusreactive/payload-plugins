import { classifyField, tabScopes } from "./kernel";
import type {
  ArrayFieldLike,
  BlocksFieldLike,
  ChildOutput,
  FieldLike,
  FieldWalker,
  GroupFieldLike,
  TabLike,
} from "./types";

/**
 * Internal engine backing {@link walkFields}. Methods return `true` to mean "stop requested —
 * unwind and halt the entire walk". A class is used (over nested functions) because the three
 * steps are mutually recursive; methods can reference each other without use-before-define
 * ordering.
 *
 * @internal
 */
class FieldTreeWalker<Cursor extends object, Out> {
  private readonly walker: FieldWalker<Cursor, Out>;

  constructor(walker: FieldWalker<Cursor, Out>) {
    this.walker = walker;
  }

  run(fields: FieldLike[], root: Cursor): Out | undefined {
    const out: ChildOutput<Out>[] = [];
    if (this.level(fields, root, out)) return undefined;
    return this.walker.combine({ kind: "root", field: null }, out, root);
  }

  /** Walk one data level (root, a group/tab body, or a list element), pushing child outputs into `out`. */
  private level(fields: FieldLike[], cursor: Cursor, out: ChildOutput<Out>[]): boolean {
    for (const field of fields) {
      const structure = classifyField(field);
      switch (structure.kind) {
        case "presentational":
          break;
        case "transparent":
          if (this.level(structure.fields, cursor, out)) return true;
          break;
        case "tabs":
          for (const scope of tabScopes(structure.field)) {
            if (scope.named) {
              if (this.object(scope.tab, scope.tab.name, scope.tab.fields, cursor, out))
                return true;
            } else if (this.level(scope.fields, cursor, out)) {
              return true;
            }
          }
          break;
        case "group":
          if (this.object(structure.field, structure.name, structure.fields, cursor, out))
            return true;
          break;
        case "array":
        case "blocks":
          if (this.list(structure.field, structure.name, cursor, out)) return true;
          break;
        case "leaf": {
          const leafOut = this.walker.leaf(structure.field, cursor);
          if (leafOut !== undefined) out.push({ key: structure.name, out: leafOut });
          break;
        }
        default: {
          // Exhaustiveness guard: if a new FieldStructure kind is added, this errors at compile time.
          const exhaustive: never = structure;
          throw new Error(`unhandled field structure: ${String(exhaustive)}`);
        }
      }
    }
    return false;
  }

  /** Descend a single-object boundary (named group or named tab) and assemble it. */
  private object(
    field: GroupFieldLike | (TabLike & { name: string }),
    key: string,
    childFields: FieldLike[],
    cursor: Cursor,
    out: ChildOutput<Out>[]
  ): boolean {
    const result = this.walker.enterObject(field, cursor);
    if (result === "stop") return true;
    if (result === "skip") return false;

    const childOut: ChildOutput<Out>[] = [];
    if (this.level(childFields, result, childOut)) return true;

    const assembled = this.walker.combine({ kind: "object", field, key }, childOut, result);
    if (assembled !== undefined) out.push({ key, out: assembled });
    return false;
  }

  /** Descend an array/blocks boundary, assembling each element then the list itself. */
  private list(
    field: ArrayFieldLike | BlocksFieldLike,
    key: string,
    cursor: Cursor,
    out: ChildOutput<Out>[]
  ): boolean {
    const result = this.walker.enterList(field, cursor);
    if (result === "stop") return true;
    if (result === "skip") return false;

    const elements: ChildOutput<Out>[] = [];
    for (const child of result) {
      const childOut: ChildOutput<Out>[] = [];
      if (this.level(child.fields, child.cursor, childOut)) return true;

      const elementOut = this.walker.combine(
        { kind: "element", field, key: child.key },
        childOut,
        child.cursor
      );
      if (elementOut !== undefined) elements.push({ key: child.key, out: elementOut });
    }

    const listOut = this.walker.combine({ kind: "list", field, key }, elements, cursor);
    if (listOut !== undefined) out.push({ key, out: listOut });
    return false;
  }
}

/**
 * Depth-first walk of a Payload field **schema**, driving a caller-supplied
 * {@link FieldWalker}. The single traversal engine this package's data operations build on
 * (filtering, reconciling, collecting, navigating).
 *
 * The engine owns structural dispatch (via {@link classifyField} / {@link tabScopes}) and the
 * recursion; the caller owns the **data** through the opaque `Cursor` and decides what to
 * produce. The engine never reads the cursor — so the caller can thread one, two, or more
 * parallel data trees (plus a path) inside it. Containers are assembled bottom-up via
 * `combine`, after their children.
 *
 * @template Cursor - The caller's data position threaded through the walk (e.g. the current
 * data object, a `{ source, target }` pair, plus a path). Constrained to `object` so a cursor
 * can never collide with a {@link WalkSignal} string (`'skip'`/`'stop'`).
 * @template Out - What the walker produces per node and assembles per container (e.g. a
 * rebuilt data subtree, or `void` for a collect-only walk).
 *
 * @param fields - The schema to walk (a collection/global/group `fields` array).
 * @param root - The initial `Cursor` paired with the top-level `fields`.
 * @param walker - The behavior to drive: `enterObject` / `enterList` derive child cursors (or
 * return a {@link WalkSignal} to `'skip'` a branch or `'stop'` the whole walk), `leaf`
 * produces a value per data-affecting leaf, and `combine` assembles each container from its
 * children.
 * @returns The root `combine` output. `undefined` if the walk was halted by `'stop'` before the
 * root assembled, OR if the root `combine` itself returned `undefined` (e.g. a collect-only
 * walker). To distinguish "stopped" from "empty result", track it via the cursor, not this value.
 *
 * @example
 * Keep only localized leaves and rebuild the data tree (a "filter" walk):
 * ```ts
 * type Cursor = { data: Record<string, unknown> };
 *
 * const filtered = walkFields<Cursor, unknown>(schema, { data }, {
 *   enterObject: (field, c) =>
 *     isRecord(c.data[field.name]) ? { data: c.data[field.name] } : "skip",
 *   enterList: (field, c) => toItemCursors(field, c), // one ChildCursor per element
 *   leaf: (field, c) => (field.localized ? c.data[field.name] : undefined),
 *   combine: (container, children) => {
 *     if (children.length === 0) return undefined; // drop empty containers
 *     if (container.kind === "list") return children.map((ch) => ch.out);
 *     return Object.fromEntries(children.map((ch) => [ch.key, ch.out]));
 *   },
 * });
 * ```
 *
 * @see {@link FieldWalker} for the full visitor contract and the caller shapes it subsumes.
 * @public
 */
export function walkFields<Cursor extends object, Out>(
  fields: FieldLike[],
  root: Cursor,
  walker: FieldWalker<Cursor, Out>
): Out | undefined {
  return new FieldTreeWalker(walker).run(fields, root);
}
