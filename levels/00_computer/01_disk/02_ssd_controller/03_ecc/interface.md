# interface — 00_computer/01_disk/02_ssd_controller/03_ecc

> Phase 1. **Owned by the PARENT folder.** Children import; only parent edits.

## Symbols this level emits UP

| symbol | meaning | latched on |
|---|---|---|
| `[ECC]` | the LDPC encode/decode engine inside `[SSDCTRL]` | controller boot |
| `ecc.encoded` | host data wrapped with parity into a codeword ready for NAND | encoder output stage |
| `ecc.decoded` | read codeword successfully corrected | LDPC iteration converges |
| `ecc.uncorrectable` | decode budget exhausted; raw bit errors exceed code strength | iteration limit hit without convergence |
| `ecc.raw_ber` | per-page raw bit-error count telemetry | every successful decode |

## Symbols this level expects DOWN

| symbol | meaning | producer (child folder) |
|---|---|---|
| _none_ | leaf level — no child folders | — |

## Cross-cutting refs

- `[FCH]` (`_flash_channel/`) — codeword bytes flow through ECC to/from the channel
- `[NAND]` (`02_nand_die/`) — the source of raw bit errors that ECC corrects
- `[NCELL]` (`02_nand_die/03_nand_cell/`) — physical origin of error rate (worn cells, voltage-band drift)
- `[FTL]` (sibling) — uses `ecc.raw_ber` to estimate block health for wear-leveling
- `[SSDCTRL]` (parent) — escalates to read-retry / soft-decode on `ecc.uncorrectable`
