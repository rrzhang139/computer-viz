# interface — 00_computer

> Phase 1. **Owned by 00_computer (this is the root).** Children import; only this folder edits.

`00_computer` is the **root** of the visualization. There is no parent, so there are no UP-emitted symbols. This file's job is to enumerate every direct child folder and the symbol it produces, so child agents can confirm what their parent expects of them.

## Symbols this level emits UP

None — this is the root level. No higher level references `00_computer`.

| symbol | meaning | latched on |
|---|---|---|
| — | (root has no parent) | — |

## Symbols this level expects DOWN

Every direct child of `00_computer/` and the `[BRACKET]` symbol it produces (or, for connectors, the relationship it owns). Child agents must declare these in their own `spec.md → SYMBOL` field.

| symbol | meaning | producer (child folder) |
|---|---|---|
| `[CHIP]` | one CPU socket: cores + uncore + memctrl | `01_chip/` |
| `[RAM]` | main memory (DDR5 DIMMs) | `01_ram/` |
| `[DISK]` | SSD as a peripheral (NVMe) | `01_disk/` |
| `[NIC]` | network interface controller | `01_network/02_nic/` (grouped under `01_network/`) |
| `[PHY]` | ethernet PHY chip | `01_network/02_phy/` (grouped under `01_network/`) |
| `[OS]` | the kernel as a single logical block (no silicon) | `01_os/` |
| `[BOOT]` | firmware → bootloader → kernel init chain | `01_boot/` |
| `[PCIE]` | PCIe link (CPU socket ↔ NVMe / GPU / NIC) | `_pcie/` (connector) |
| — | DMI link: CPU ↔ chipset (PCH) | `_dmi/` (connector, no `[SYM]` of its own) |

Notes on the table above:
- `01_network/` is a grouping folder; its two children (`02_nic`, `02_phy`) own the actual symbols. The case-photo hotspot for the network card highlights both as a unit.
- `01_os/` and `01_boot/` are **logical** children — no dedicated silicon. They run on `[CHIP]` but are listed at the top level so the user can navigate to them from the bird's-eye view (the user does not need to know they "live inside" the CPU package).
- Connectors (`_pcie/`, `_dmi/`) are first-class siblings per INVARIANTS § "Connector convention". Clicking a wire in the case photo zooms to the connector folder.

## Cross-cutting refs

- Execution-pointer rendering at this level reads `pc`, `pipelineStage`, `memTraffic.level`, `diskActivity`, `netActivity` from `EXECUTION_SCHEMA.md` and projects them as a glowing dot on `[CHIP]` plus secondary pulses on `[RAM]`/`[DISK]`/`01_network` when those resources are touched.
- Time scale: TIME_AXIS row `00_computer` (`1 anim sec ⇒ 5 instr`). The corner ruler shows `depth: computer | 1 sec ⇒ 5 instr` while this level is on screen.
- Symbolic-overlay toggle (`overlay: 'on' | 'off'`) is mandatory per INVARIANTS § "Symbolic overlay" — when on, hotspot polygons gain `[CHIP]` / `[RAM]` / `[DISK]` bracket-labels and arrow annotations between sockets and DIMMs.
- Tier 1 (photographic) — see `art.md` for sourcing plan and hotspot polygon strategy.
- Children that are themselves Tier-1 photo levels (`01_chip`, `01_ram`, `01_disk`, `01_network/02_nic`, `01_network/02_phy`) inherit the case-photo aesthetic — clicking them transitions from the bird's-eye photo into a per-component close-up photo.
