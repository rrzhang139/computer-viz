# interface — 00_computer/01_os/_napi

> Phase 1. **Owned by the PARENT folder.** Children import; only parent edits.

## Symbols this level emits UP

| symbol | meaning | latched on |
|---|---|---|
| `[NAPI]` | per-RX-queue NAPI poll context | `napi_schedule()` |
| `pollState` | one of `IDLE` / `SCHEDULED` / `POLLING` | every state transition |
| `budgetUsed` | packets drained in current poll cycle (0..budget) | each poll iteration |

## Symbols this level expects DOWN

(connector — no child folders; this is a zoomable edge)

## Cross-cutting refs

- Triggered by hard IRQ from `[NIC]` (`00_computer/01_network/02_nic/`) on RX descriptors filled.
- Pulls skbs from `01_network/02_nic/_dma_ring/` (the RX descriptor ring).
- Hands skbs to sibling `02_netstack/` via `__netif_receive_skb_core`.
- Wakeups for arrived data eventually reach sibling `02_scheduler/` (`[RUNQ]`) when an skb hits a blocked `[SOCK]`.
- TIME_AXIS row: `_napi` (1 anim sec ⇒ 50 µs).
- Distinct from TX path: TX is `[QDISC]` → driver, NOT NAPI.
