# ADR-0002: A published barrel exports only what a consumer must name

- **Status:** Accepted
- **Date:** 2026-10-08
- **Scope:** every publishable package — the `src/index.ts` each one ships as its entry point

## Context

A package's `index.ts` is the only part of it that is a promise. Everything behind it can be
renamed, reshaped or deleted between releases; everything in front of it cannot, and a type
published once is a type someone can import, annotate with, and build on.

Re-exports arrive there for reasons that feel like diligence at the time:

- a reviewer observes that an outside implementer "cannot name" a type the contract mentions;
- a symbol is needed by a test or a fixture, and the barrel is the nearest import path;
- a type is already exported from a module barrel one level down, so lifting it looks free.

None of these is evidence that a consumer needs the name. In the case that produced this ADR,
`EnqueueAssignment` and `Task` were added to the translator's barrel so a third-party `TaskRunner`
could annotate what it returns. A compile-only probe then showed that a complete outside runner
compiles **without naming either type**: the shapes are inferred from `TaskRunnerProvider`, the one
name that genuinely crosses the boundary. The export enabled nothing.

What it did **not** do is make those types public — they already were. `TaskRunnerProvider` is
exported, its `create` returns a `TaskRunner`, and that interface's methods answer with
`EnqueueAssignment[]` and `Task[]`. Every one of those names is emitted into the published
declarations and reachable through `ReturnType`, `Parameters` or a direct import. A barrel decides
how conveniently a consumer can *name* a type, not whether the type is part of the contract.

## Decision

**A symbol belongs in a published `index.ts` only when a consumer outside the package cannot do
their job without naming it.** Before adding a re-export, answer three questions in order:

1. **Can the consumer's code compile without the name?** Write the consumer — twenty lines in a
   scratch file is enough — and type-check it. Contextual typing from an exported interface covers
   object literals, callbacks and return positions. If it compiles, the export is not needed.
2. **Who is the consumer, concretely?** A test, a fixture, or another file inside this repository is
   not one; it has internal import paths. "A third party might" is not one either unless the export
   is what makes their code possible, which question 1 settles.
3. **Is the surface coherent without it?** Exporting a return type while the interface that returns
   it stays internal is a half-measure: it publishes maintenance cost without publishing capability.
   Either the whole seam is public or none of it is.

Three consequences follow:

- **An unexported type is not a defect.** A review finding of the form "an implementer cannot name
  X" is answered by question 1, not by an export. Record the answer; do not widen the surface.
- **When a seam does become public, it goes whole.** The interface, its inputs and its outputs
  together — and not before the types in it are tight enough to live with.
- **Reachability is the real test of what is public, and it is wider than the barrel.** Anything a
  published interface leads to is already a compatibility obligation: reshaping it breaks consumers
  whether or not its name was ever re-exported. So the question "is this type public?" is answered by
  following the signatures out of `index.ts`, not by reading the export list. Keeping a loose type
  out of the barrel buys tidiness, never freedom to change it.

## Consequences

- Fixtures and conformance files import the published name where they are *proving* the published
  path works, and internal paths otherwise. A fixture that imports five internal names to exercise a
  one-name public surface is testing the wrong thing.
- The per-package `@since` rule still applies to whatever does get published; this ADR decides *what*
  is published, that rule decides how it is annotated.
- Removing an export that was never released costs nothing. Removing one that shipped is a breaking
  change, which is the asymmetry this ADR exists to respect.

## Status of the case that prompted it

`EnqueueAssignment` and `Task` were removed from the translator's barrel before 0.16.0 shipped, and
`TaskRunner.conformance.types.ts` was rewritten to import one name and infer the rest — which is now
the fixture's point as well as its implementation.
