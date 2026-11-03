/**
 * Whether a collection's `create` permission, as the admin receives it, lets the user create. An
 * access function that answers a `Where` reaches the client as `{ permission: true, where }`, not
 * as `true`, so a bare `=== true` test would disable the button for a role that is scoped to a
 * folder.
 */
export const isCreatePermitted = (create: unknown): boolean => {
  if (create === true) {
    return true;
  }

  return (
    typeof create === "object" &&
    create !== null &&
    (create as { permission?: unknown }).permission === true
  );
};
