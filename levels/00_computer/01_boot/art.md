# art — 00_computer/01_boot

> Phase 1+. Declares rendering tier and asset sources for this level.

## Tier (auto-suggested; confirm or change)

```
tier: 3-stylized
```

**Confirmed.** Boot has no physical form: there is nothing to photograph (Tier 1 ruled out) and no spatial 3D structure (Tier 2 ruled out). Tier 3 stylized rich-SVG is the only honest tier — but per INVARIANTS § "Rendering tiers" this must look richer than a Visio diagram, with gradients, depth, and animated particle flow along the stage chain.

## Asset sources

This level is **fully synthesized in SVG** — no external assets. Every visual is authored as paths, gradients, and filter primitives in `src/components/Boot.tsx` (Phase 4) reading data from `physical.md` (Phase 3).

### Stage-chain visualization spec

Five stage panels arrayed LEFT→RIGHT across the canvas (data flow = stage progression), each with a hand-off arrow to the next. Stage panels stack vertically inside themselves (annotations top-to-bottom inside the panel). The canvas has a deep background gradient that progresses through the stages — cool-blue at stage 1 (cold boot), warming through purple to amber-pink as `[OS]` ignites at stage 5.

| stage | panel label | inside-panel iconography | hand-off arrow label |
|---|---|---|---|
| 1 | UEFI / BIOS | SPI flash chip glyph; "POST", "memory training", "PCIe enum", "load EFI app" | `EFI app loaded` |
| 2 | Bootloader (GRUB / systemd-boot) | abstract "menu + selected entry"; "load kernel + initramfs into `[RAM]`" | `kernel image in [RAM]` |
| 3 | Kernel decompress + early init | unfurling-kernel motif; "decompress", "page tables", "MMU on", "SMP bring-up" | `[MMU] enabled, AP cores online` |
| 4 | initramfs / pivot | small RAM-disk glyph; "load `[DRV]`s", "mount real root", "switch_root" | `real root mounted` |
| 5 | PID 1 (systemd) | service-tree glyph (a single root node sprouting branches); "exec systemd", "service tree starts" | `→ [OS]` (handoff to `01_os/`) |

### Gradient & color spec

Per INVARIANTS § "Color tokens" — never invent. Drawn from `--color-data`, `--color-control`, `--color-storage`, `--color-active`, `--color-passive`, `--color-fg`, `--color-edge`, `--color-bg`. Token-only.

- **Canvas background**: a horizontal `linearGradient` from `var(--color-bg)` (left) through a slight `var(--color-storage)` blue-purple haze (middle) to a warm `var(--color-active)` glow at the rightmost edge — the visual metaphor of "the machine waking up." Use `<filter><feGaussianBlur>` to soften it; do not let it compete with stage panels.
- **Stage panel fill**: `radialGradient` per panel, centered, going from `var(--color-passive)` at the rim to a token-derived center color depending on state:
  - **active stage**: center = `var(--color-active)` at low alpha (~0.25), with a slow `<animate>` brightness pulse synced to the global cycle clock.
  - **completed stage**: center = `var(--color-data)` at medium alpha (~0.15) — cool, "done."
  - **future stage**: center = `var(--color-passive)` at low alpha — dim, dashed border.
- **Stage panel border**: 1.5px stroke `var(--color-edge)`; on the active stage promote to `var(--color-edge-active)` (which resolves to `var(--color-control)` since stage transitions are control-flow, not data).
- **Hand-off arrow**: `var(--color-control)` orange — these are **control** transitions (one stage gives the next a "go" signal), per INVARIANTS § "Spatial rules" (control = TOP/orange). When the cursor is on an arrow, particles flow along it (see particle behavior below).
- **Annotations / labels**: `var(--color-fg)` off-white. Bracket-symbol annotations (`[CHIP]`, `[RAM]`, `[DISK]`, `[MMU]`, `[PT]`, `[DRV]`, `[OS]`) appear as call-out chips beside each stage when overlay is `on`, showing which symbol that stage touches.

### Depth-stacking choices (so it does NOT look like Visio)

1. Three SVG layers, back to front:
   - **Layer A (background)**: the global canvas gradient + a faint, blurred grid that hints at "wires" flowing under the stages — slow horizontal drift implemented as `<animateTransform>` on the grid `<pattern>`.
   - **Layer B (stage panels)**: the five panels, each with a `<filter>` drop-shadow giving them slight elevation off the background.
   - **Layer C (overlay & particles)**: hand-off arrows, particle streams, bracket-label chips (overlay-only). This layer also hosts the execution-pointer glow.
2. Each stage panel is a rounded rect with an inner `radialGradient` and an outer `<filter id="boot-glow"><feGaussianBlur stdDeviation="6"/></filter>` — gives it a subtle bloom against the dark canvas.

### Particle behavior (the "animated particle flow" required by Tier 3)

Three particle behaviors, each driven by `ExecutionState` rather than independent simulation:

1. **Stage-internal "work" particles**: while a stage is active, small dots orbit slowly inside the panel, color = `var(--color-data)`. Density ramps with `microStep` within the stage. Implementation: `<circle>` elements positioned via `<animateMotion>` along a closed path inside each panel. Pause when the global animation is paused.
2. **Hand-off arrow particles**: at the moment of hand-off (stage N → stage N+1), a burst of `var(--color-control)` particles streams along the arrow path from N to N+1. Implementation: same `<animateMotion>` along the arrow `<path>`, triggered by the stage-transition event. Single-shot per transition.
3. **Backdrop "wires" drift**: continuous, slow LEFT→RIGHT drift of a faint pattern under the panels — sells the "data is flowing through the chain" feel without distracting from the active stage. Pure decorative; tied to the global playback rate.

### Symbolic overlay (toggle)

When `overlay: 'on'`:
- Each stage panel gains a left-edge bracket-chip listing the symbols it consumes and produces (e.g. stage 3 chip: `consumes: [DISK]·kernel-img → produces: [PT], [MMU]·on, [CORE]·smp-up`).
- Hand-off arrows gain text labels (`EFI app loaded`, `kernel image in [RAM]`, `[MMU] enabled, AP cores online`, `real root mounted`, `→ [OS]`) — same wording as the spec table.
- Tiny clock badges appear on each panel showing the TIME_AXIS unit (`stage`).

LayoutGroup IDs (stable across overlay states): `boot-stage-1` through `boot-stage-5`, `boot-arrow-1-2` through `boot-arrow-4-5`, `boot-bg-gradient`, `boot-handoff-os`.

### Execution-pointer rendering at this level

Reads `cycle` from `ExecutionState`. At this level there is no real `[CORE]` instruction yet for stages 1-3 (the CPU is running firmware, not the demo program); the pointer is the *active stage marker*, not the assembly `pc`. Stage activation order:

| `cycle` range (boot-relative) | active stage |
|---|---|
| `[0, t_uefi)` | 1: UEFI/BIOS |
| `[t_uefi, t_bootloader)` | 2: Bootloader |
| `[t_bootloader, t_kinit)` | 3: Kernel decompress + early init |
| `[t_kinit, t_initramfs)` | 4: initramfs / pivot |
| `[t_initramfs, t_pid1)` | 5: PID 1 |
| `≥ t_pid1` | inert; show "→ `[OS]`" handoff arrow lit |

(Exact `t_*` thresholds live in `timing.md`, Phase 1; this file just declares strategy.)

## Reasoning

Boot is the only top-level sibling of `00_computer` that has no physical form — it is a process, not a thing. Tier 3 stylized SVG with a left-to-right stage chain matches both INVARIANTS' tier rules and the user's mental model (boot = a sequence). The gradient progression (cool → warm) makes the metaphor "machine warming up" legible without text. Particle flow on hand-off arrows is the natural place to spend Tier-3 visual budget because it is exactly *where the execution-pointer's `cycle` boundaries fall* — the user sees a particle burst at the moment one stage hands off to the next, which mirrors the underlying state machine.
