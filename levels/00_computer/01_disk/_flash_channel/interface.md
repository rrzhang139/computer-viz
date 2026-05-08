# interface — 00_computer/01_disk/_flash_channel

> Phase 1. **Owned by the PARENT folder.** Children import; only parent edits.

## Symbols this level emits UP

| symbol | meaning | latched on |
|---|---|---|
| `[FCH]` | one ONFI/Toggle channel between `[SSDCTRL]` and a row of `[NAND]` dies | drive boot / channel trained |
| `fch.busy` | bus is currently driven (CE# low + DQ active) | first WE#/RE# of a burst |
| `fch.cmd_latched` | command byte clocked into the addressed die | CLE high + WE# rising edge |
| `fch.burst_done` | data phase of a transaction complete | last DQS toggle of the burst |

## Symbols this level expects DOWN

| symbol | meaning | producer (child folder) |
|---|---|---|
| _none_ | leaf connector — no child folders in V1 | — |

## Cross-cutting refs

- parent: `01_disk/` (owns this connector, places it between `[SSDCTRL]` and `[NAND]`)
- `[SSDCTRL]` (`02_ssd_controller/`) — channel scheduler that drives this bus from the controller side
- `[NAND]` (`02_nand_die/`) — the dies sitting on the bus; chip-enable steers which one responds
- `[ECC]` / `[FTL]` (sub-blocks of controller) — codewords + page addresses are what flows on the bus
- contrast with `[_nvme_link]` (host side) — `[FCH]` is the *device-internal* parallel bus; `[_nvme_link]` is the *host-facing* serial transport. Both connect into `[SSDCTRL]` from opposite sides
