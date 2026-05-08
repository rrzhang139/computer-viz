# spec — 00_computer/01_boot

> Phase 1. Level agent owns this file.

## Motivation (REQUIRED — one paragraph, no diagrams)

When you press the power button, no program is running yet — `[RAM]` is uninitialized noise, the `[CORE]` has no `pc` to fetch from, and there is no `[OS]` to mediate anything. Something has to bootstrap the machine from "voltage just appeared at the rails" to "PID 1 is alive and `[OS]` is running normal user programs." That bootstrap is `[BOOT]`: a fixed, hard-wired chain of stages — UEFI/BIOS firmware → bootloader (GRUB / systemd-boot) → kernel image decompresses into `[RAM]` → kernel sets up page tables and mounts initramfs → systemd spawns as PID 1 — each stage handing control to the next via a known protocol. Without this chain you have inert silicon. The chain is also the only place in the whole visualization where the machine runs *without* an OS, so it earns its own level: it is the answer to "where does `[OS]` come from?" and the precondition for every other zoom path. Out-of-scope after PID 1: from there, everything happens inside `[OS]` and is owned by the `01_os/` subtree.

## ROLE
The bootstrap chain that takes the machine from power-on to a running `[OS]` with PID 1. A logical, time-ordered sequence of stages, not a piece of silicon.

## MADE OF
A fixed pipeline of 5 stages, each consuming the previous stage's output as control:
1. **UEFI/BIOS firmware** — runs from on-board SPI flash; POSTs hardware (clocks, memory training, PCIe enum); reads NVRAM boot order; loads the EFI bootloader from the EFI System Partition on `[DISK]`.
2. **Bootloader** (GRUB or systemd-boot) — loads the kernel image and initramfs from `[DISK]` into `[RAM]`; passes the kernel command line.
3. **Kernel decompress + early init** — kernel image decompresses in place; sets up page tables (later owned by `[PT]`); turns on the `[MMU]`; brings secondary `[CORE]`s online; mounts initramfs as the temporary root.
4. **Initramfs / kernel handoff** — runs early userspace from a RAM disk to load drivers needed to mount the real root FS (e.g. NVMe `[DRV]`, encryption); pivots to the real root.
5. **PID 1 (systemd)** — `[OS]` execs systemd; service tree starts; out-of-scope from here on.

(There is no preceding `[BRACKET]` symbol because each stage is logical / textual at this level. Children, if added later, would zoom into individual stages.)

## INPUTS
- **LEFT (data)**: power-on rails (Vdd reaches stable voltage), the EFI System Partition contents on `[DISK]`, kernel image + initramfs on `[DISK]`.
- **TOP (control)**: the AC power-on signal from `00_computer` (the only "wake" trigger for the whole machine). Each stage's completion is itself a control signal handing off to the next.

## OUTPUTS
- **RIGHT**: a running `[OS]` with PID 1 alive, `[CORE]`(s) executing kernel/user code, `[MMU]` enabled, `[PT]` populated, drivers loaded. After this, control passes to `01_os/` — every subsequent zoom path starts from the OS being already up.

## SYMBOL
`[BOOT]` (registered in GLOSSARY.md under OS/kernel section, defined here).

## Notes
- this is a NODE level, but **logical** — no silicon of its own. The execution substrate is `[CHIP]` running firmware out of SPI flash, then code out of `[RAM]`.
- Tier 3 stylized SVG (see `art.md`) — a left-to-right stage chain with annotations is the right aesthetic; there is nothing to photograph (the stages are conceptual, not physical).
- Time scale: TIME_AXIS row `01_boot` (`1 anim sec ⇒ 1 stage`). Five stages = ~5 seconds end-to-end at default playback. The corner ruler shows `depth: boot | 1 sec ⇒ 1 stage`.
- Spatial invariants apply (see /INVARIANTS.md): stages flow LEFT→RIGHT (data progression); the AC power-on signal enters from TOP at stage 1.
- After PID 1: out of scope. Service-graph / userspace startup belongs to `01_os/02_process/` and `01_os/02_scheduler/`, not here.
- Reset path (warm reboot, panic) is also out of scope for V1; we visualize cold-boot only.
