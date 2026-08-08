/**
 * Ownership of the object URLs backing design textures.
 *
 * WHY THIS IS NOT `URL.revokeObjectURL` AT THE CALL SITE ANY MORE
 *
 * Removing a design used to revoke its texture immediately. That is correct right
 * up until undo exists: the history still holds a snapshot referencing that url,
 * so undoing the delete would restore a design whose texture had already been
 * destroyed — a silently blank tattoo, with nothing in the console to explain it.
 *
 * So revocation becomes a reachability question instead of a lifecycle one. A url
 * is freed only once no snapshot in the past, present or future references it,
 * which is exactly when the user can no longer reach it by any sequence of undo or
 * redo. Bounded history keeps the set small.
 */
const tracked = new Set<string>()

export function trackTexture(url: string): void {
  tracked.add(url)
}

/**
 * Revokes every tracked url that no longer appears in `live`.
 * Call it after any mutation that rewrites the history stacks.
 */
export function releaseUnreachable(live: Iterable<string>): void {
  const keep = live instanceof Set ? live : new Set(live)

  for (const url of tracked) {
    if (keep.has(url)) continue
    URL.revokeObjectURL(url)
    tracked.delete(url)
  }
}

/** Frees everything. Used when a loaded session replaces the whole document. */
export function releaseAll(): void {
  for (const url of tracked) URL.revokeObjectURL(url)
  tracked.clear()
}
