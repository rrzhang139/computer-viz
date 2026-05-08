# art — 00_computer/01_os/02_vfs

> Phase 1+. Declares rendering tier and asset sources for this level.

## Tier (auto-suggested; confirm or change)

```
tier: 3-stylized
```

Options:
- `1-photo` — Tier 1: real photo / die-crop with SVG hotspot overlay
- `2-3d` — Tier 2: react-three-fiber 3D scene with materials and particles
- `3-stylized` — Tier 3: rich SVG (gradients, glows, depth, particle flows). NOT a Visio diagram.

## Asset sources

Tier 3 stylized SVG: a translucent dispatch hub at center; incoming syscall arrows from TOP carry path strings as text-textured particles. The hub holds an ops-table fan — multiple labeled slots (ext4 / xfs / procfs / tmpfs / nfs) — and the active filesystem's slot lights up (`--color-active`) as the current request routes through it. Below the hub: `[DENTRY]` and `[INODE]` cache tiles glowing when consulted. Path traversal animates as a sequence of small dentry-tile illuminations along the path string.

## Reasoning

VFS is a *router* + *cache*; Tier 3 lets us draw the routing fan with multiple downstream FS targets visible at once, plus the dentry/inode caches as a textured surface. A flat box would imply VFS does the work itself — wrong; the visual must show pass-through.
