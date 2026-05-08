# interface — 00_computer/01_os/02_vfs/03_dentry

> Phase 1. **Owned by the PARENT folder.** Children import; only parent edits.

## Symbols this level emits UP

| symbol | meaning | latched on |
|---|---|---|
| `[DENTRY]` | one cached path component → inode | hash-table lookup hit |
| dentry-cache hit/miss | per path step | every lookup |

## Symbols this level expects DOWN

| symbol | meaning | producer (child folder) |
|---|---|---|
| (none — leaf) | | |

## Cross-cutting refs

- TIME_AXIS row: `02_vfs/03_dentry` — native unit `path-step`, 1 anim sec ⇒ 1 path component lookup.
- `01_os/02_vfs/03_inode/` — points to inodes that are sibling-cached.
- `01_os/02_vfs/` — orchestrates the per-component traversal walk.
