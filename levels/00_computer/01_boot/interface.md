# interface — 00_computer/01_boot

> Phase 1. **Owned by the PARENT folder (`00_computer/`).** `01_boot/` imports; only the parent edits.

## Symbols this level emits UP

What `[BOOT]` produces for `00_computer/` (the parent) to reference. Latching = the moment the value becomes valid for higher levels to read.

| symbol | meaning | latched on |
|---|---|---|
| `[BOOT]` | the boot chain itself, as one logical block in the parent's case-photo | always present (badge); active only during `cycle ∈ [0, boot_complete]`, idle thereafter |
| `boot_complete` (event, not a symbol) | rising edge when PID 1 is alive — handoff signal to `01_os/` | end of stage 5 |

There is no continuous data wire from `[BOOT]` to its parent. Boot is a one-shot bring-up; after `boot_complete`, this level is **inert** (the badge in the parent's photo dims; clicking still navigates here for replay, but the execution-pointer no longer stops here).

## Symbols this level expects DOWN

`01_boot/` currently has **no children** — boot stages are visualized at this level as a stage-chain (see `art.md`), not as separate folders. Per LEVELS.md the folder is a leaf in V1.

| symbol | meaning | producer (child folder) |
|---|---|---|
| — | (no children in V1) | — |

If V2 splits the stages into per-folder children (`02_uefi/`, `02_bootloader/`, `02_kernel_init/`, `02_initramfs/`, `02_pid1/`), they would each emit a stage-completion event back up to this level. Out of scope for Phase 1.

## Cross-cutting refs

- **Hand-off to `[OS]`**: `boot_complete` is the precondition for every other zoom path in `01_os/`. The `01_os/spec.md` motivation should not need to re-explain bring-up; it inherits the post-boot machine state from here.
- **Producers consumed during boot**:
  - `[CHIP]` — runs firmware from SPI then kernel from `[RAM]`; secondary `[CORE]`s come online during stage 3.
  - `[RAM]` — memory training during stage 1; kernel + initramfs land here in stage 2.
  - `[DISK]` — provides EFI System Partition (stage 1), kernel + initramfs (stage 2), real root FS (stage 4). Reads only; no writes during boot in V1.
  - `[PT]` (defined in `01_os/02_pagetables/`) — populated during stage 3; `[MMU]` flips on at the same time. Cross-cuts `01_os/02_mmu/`.
  - `[DRV]` (defined in `01_os/02_driver/`) — loaded during stage 4 from initramfs.
- **Time scale**: TIME_AXIS row `01_boot` (`1 anim sec ⇒ 1 stage`). Each stage transition is a discrete tick — there is no sub-stage micro-step at this level.
- **Execution-pointer behavior at this level**: the active stage's box glows `var(--color-active)`; previously-completed stages are dim `var(--color-passive)`; the not-yet-reached stages are very faint with the dashed outline. Once `boot_complete`, the whole chain dims and a small "→ `[OS]`" arrow lights up on the right edge.
- **Realism note**: `[BOOT]` has no physical form — Tier 3 stylized SVG is the only honest tier (see `art.md`). The "physical" rendering inside `01_boot/` is the stage chain itself; there is no photograph to fall back to.
- **No connector folders**: boot's relationship to `[OS]` is a one-shot handoff, not a sustained edge, so it does not warrant a `_*` connector folder.
