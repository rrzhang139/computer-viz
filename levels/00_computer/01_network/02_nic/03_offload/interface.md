# interface — 00_computer/01_network/02_nic/03_offload

> Phase 1. **Owned by the PARENT folder.** Children import; only parent edits.

## Symbols this level emits UP

| symbol | meaning | latched on |
|---|---|---|
| `[OFFLOAD]` | the TSO/CSO/RSS subsystem of the NIC | offload-enable bits set in MMIO config |
| segment-emitted | one MTU-sized TX segment ready for `[MAC]` | header rewrite + checksum complete |
| rss-hash | 32-bit Toeplitz hash + chosen RX queue id | end-of-RX-frame from `[MAC]` |

## Symbols this level expects DOWN

| symbol | meaning | producer (child folder) |
|---|---|---|
| (none) | leaf for Phase 1 | — |

## Cross-cutting refs

- Sibling `03_mac/` — consumes TX segments, supplies RX frames.
- `[SKB]` (kernel) — TX super-skbuff carries TSO hints (gso_size, gso_type) that this block reads.
- `[QDISC]` and multi-queue `_napi` — RSS queue assignment dictates which CPU runs the RX softirq.
- TIME_AXIS row `02_nic/03_offload`.
