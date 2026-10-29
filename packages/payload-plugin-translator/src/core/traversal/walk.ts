import type { Crossing, IdPath, PathSegments, RegisteredLanguage } from "./contract.js";
import {
  CannotEnterLanguageError,
  TooManyCrossingsError,
  TraversalCycleError,
} from "./errors/index.js";
import { createRegistry } from "./registry.js";
import type { Registry } from "./registry.js";

export type LeafVisit = {
  language: RegisteredLanguage;
  node: unknown;
  cursor: unknown;
  value: unknown;
  setValue?: (value: unknown) => void;
  idPath: IdPath;
  crossings: number;
  cross(crossing: Crossing): void;
};

export type Visitor = {
  leaf(visit: LeafVisit): void;
};

export type WalkOptions = {
  languages: readonly RegisteredLanguage[];
  entry: Crossing;
  visit: Visitor;
  maxCrossings?: number;
};

export const DEFAULT_MAX_CROSSINGS = 8;

const extend = (path: IdPath, segments: PathSegments): IdPath =>
  segments.length === 0 ? path : [...path, ...segments];

/**
 * A node already stepped on the way here. The cursor is part of it because a language whose schema
 * lives beside the data walks the same schema node once per element — repetition is only a cycle
 * when the data position repeats too.
 */
type Frame = { node: unknown; cursor: unknown };

const isOnPath = (ancestors: readonly Frame[], node: unknown, cursor: unknown): boolean =>
  ancestors.some((frame) => Object.is(frame.node, node) && Object.is(frame.cursor, cursor));

function enterOrFail(
  language: RegisteredLanguage,
  crossing: Crossing,
  value: unknown,
  path: IdPath
): { nodes: readonly unknown[]; cursor: unknown } {
  let entered: { nodes: readonly unknown[]; cursor: unknown } | null;
  try {
    entered = language.enter({ value, context: crossing.context });
  } catch (error) {
    throw new CannotEnterLanguageError(crossing.languageId, path, error);
  }
  if (entered === null) throw new CannotEnterLanguageError(crossing.languageId, path);
  return entered;
}

function activate(
  registry: Registry,
  crossing: Crossing,
  value: unknown,
  visit: Visitor,
  path: IdPath,
  crossings: number,
  maxCrossings: number
): void {
  if (crossings > maxCrossings) throw new TooManyCrossingsError(path, maxCrossings);

  const language = registry.get(crossing.languageId);
  const entered = enterOrFail(language, crossing, value, path);

  const descend = (
    nodes: readonly unknown[],
    cursor: unknown,
    here: IdPath,
    ancestors: readonly Frame[]
  ): void => {
    for (const node of nodes) {
      if (isOnPath(ancestors, node, cursor)) throw new TraversalCycleError(here);

      const step = language.step(node, cursor);
      if (step.kind === "skip") continue;

      if (step.kind === "children") {
        const deeper = [...ancestors, { node, cursor }];
        for (const child of step.items) {
          descend(child.nodes, child.cursor, extend(here, child.segments), deeper);
        }
        continue;
      }

      const idPath = extend(here, step.segments);
      visit.leaf({
        language,
        node,
        cursor,
        value: step.value,
        setValue: step.setValue,
        idPath,
        crossings,
        cross: (next) =>
          activate(registry, next, step.value, visit, idPath, crossings + 1, maxCrossings),
      });
    }
  };

  descend(entered.nodes, entered.cursor, path, []);
}

export function walkLanguages(options: WalkOptions): void {
  const registry = createRegistry(options.languages);
  const maxCrossings = options.maxCrossings ?? DEFAULT_MAX_CROSSINGS;
  activate(registry, options.entry, undefined, options.visit, [], 0, maxCrossings);
}
