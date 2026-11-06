/**
 * The root of every failure the walk raises, so a caller can catch the lot without naming each.
 *
 * Its own root rather than a host's: the kernel depends on nothing, and an error family reaching
 * into the package that happens to contain it today is the first thing that would have to be
 * unpicked to move the kernel out.
 *
 * @public
 */
export class TraversalError extends Error {}
