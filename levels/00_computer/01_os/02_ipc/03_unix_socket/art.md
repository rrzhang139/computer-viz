# art — 00_computer/01_os/02_ipc/03_unix_socket

> Phase 1+. Declares rendering tier and asset sources for this level.

## Tier (auto-suggested; confirm or change)

```
tier: 3-stylized
```

Confirmed Tier 3. The unix socket is purely software; the visual must show two endpoints + a filesystem rendezvous + a per-endpoint receive queue.

Options:
- `1-photo` — Tier 1: real photo / die-crop with SVG hotspot overlay
- `2-3d` — Tier 2: react-three-fiber 3D scene with materials and particles
- `3-stylized` — Tier 3: rich SVG (gradients, glows, depth, particle flows). NOT a Visio diagram.

## Asset sources

- Two endpoints rendered as glowing socket-shaped capsules ("SERVER" left, "CLIENT" right), each with its own receive-queue ribbon attached. Endpoint capsule uses `--color-storage` (purple) gradient with a small fd-id label.
- Center: a filesystem rendezvous icon — a small glowing path label (e.g., `/var/run/docker.sock`) suspended above a stylized VFS halo (faint folder iconography); the bind step animates the SERVER capsule "anchoring" itself to the path label with a brief connecting spark.
- Connect step: an arc curves from CLIENT to the rendezvous path; on accept, the SERVER spawns a small accepted-endpoint capsule and the arc terminates there (preserving the listening endpoint).
- Message flow: framed datagram capsules (each in `--color-data` blue) travel along the established arc — SOCK_DGRAM shows discrete packets with visible boundaries; SOCK_STREAM shows tightly packed flowing bytes (the toggle is part of the symbolic overlay).
- TOP: a cred-passing band (`--color-control` orange) lights up briefly when SCM_RIGHTS or SO_PEERCRED-style ancillary data rides along — drawn as a small icon (a key or fd) escorted by the message capsule.

## Reasoning

The teaching contrast against `[PIPE]` is "named endpoint + framed messages + ancillary data." Tier 3 carries that with a path-label rendezvous and discrete capsule rendering. Flat boxes would lose the "you can pass fds across this" punch that distinguishes it.
