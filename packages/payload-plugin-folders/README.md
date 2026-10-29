# @focus-reactive/payload-plugin-folders

A Storyblok-style content tree for Payload 4: folders, per-folder ordering, full paths, moves with
redirects. The package is private and under construction; this file only carries what a host
needs to know about the tree lock for now.

## Known limits

Every write that changes the tree (a folder or page create, a folder update, a move) runs under
one tree lock per Payload instance. It lives as long as the write's database transaction.

- A host hook that calls `payload.create` or `payload.update` on a folder or page without passing
  `req`, inside a tree write, opens its own transaction and waits for the lock its caller holds. It
  fails after the 30 second lock timeout. Always pass `req` to nested Local API calls.
- On Postgres, queued tree writers each hold a pool connection while they wait. More parallel tree
  writes than the pool size starve other requests; size the pool for your write concurrency.
- On SQLite without `transactionOptions`, a failed operation keeps the lock until a 5 second
  watchdog releases it, and operations there are not atomic anyway. Pass `transactionOptions: {}`
  to `sqliteAdapter()`.
