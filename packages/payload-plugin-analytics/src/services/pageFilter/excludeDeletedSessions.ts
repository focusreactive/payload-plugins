/**
 * Strict exclusion: a session survives only if EVERY ref it touched is in the
 * existing set. Any deleted/empty ref drops the whole session.
 */
export function excludeDeletedSessions(
  sessionRefs: Map<string, Set<string>>,
  existing: Set<string>
): Set<string> {
  const allowed = new Set<string>();

  for (const [sessionId, refs] of sessionRefs) {
    let ok = refs.size > 0;
    for (const ref of refs) {
      if (!existing.has(ref)) {
        ok = false;
        break;
      }
    }
    if (ok) allowed.add(sessionId);
  }

  return allowed;
}
