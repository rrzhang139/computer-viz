# spec — 00_computer/01_os/_napi

> Phase 1. Level agent owns this file.

## Motivation (REQUIRED — one paragraph, no diagrams)

The naive RX path — one hard interrupt per packet — breaks at modern packet rates: a 10 Gbit NIC can deliver ~14 Mpps, far past what a CPU can interrupt-service. NAPI ("New API," now just "the API") solves this by *amortizing* interrupts: on the first packet the NIC raises a hard IRQ, the IRQ handler schedules a softirq, the softirq calls the driver's NAPI poll function, and that poll loop drains up to N packets from the descriptor ring with interrupts disabled. Only when the ring is empty does NAPI re-enable interrupts. Without `[NAPI]` the kernel either lives in interrupt storms (no useful work) or hardcodes a polling loop (wastes CPU when idle). NAPI is the connector that ties hard-IRQ → softirq → packet delivery up the stack — the entire RX path's spine.

## ROLE
Glue the bottom of the RX path: hard IRQ from `[NIC]` → ksoftirqd / softirq → driver NAPI poll → batched skb delivery into `__netif_receive_skb_core` (which dispatches into `[NETSTACK]`). Amortizes per-packet overhead by polling instead of per-packet interrupting once a stream starts.

## MADE OF
Per-NIC-queue `napi_struct` + 1 driver `poll(napi, budget)` callback + softirq `NET_RX_SOFTIRQ` + per-CPU `softnet_data` poll list. Signals: hard IRQ from `[NIC]`, `napi_schedule()` adds the napi to the poll list, ksoftirqd or `do_softirq()` drains the list calling `poll()`. Physical medium: kernel code on the same CPU as the IRQ.

## INPUTS
- LEFT (data): RX descriptor-ring entries (with DMA-completed `[SKB]` payloads) from sibling `01_network/02_nic/_dma_ring/` (the NIC's RX ring).
- TOP (control): hard IRQ vector raised by the `[NIC]`; budget cap (default 64 packets per poll cycle); back-off if poll consumes its budget.

## OUTPUTS
- RIGHT: a stream of `[SKB]`s handed to `02_netstack/` via `__netif_receive_skb_core`, which dispatches by ethertype; each delivered skb may wake a blocked `[THREAD]` in `[RUNQ]` if it terminates on a `[SOCK]`.

## SYMBOL
`[NAPI]`

## Notes
- this is a CONNECTOR (zoomable edge between siblings); owner = parent folder `01_os/`
- spatial invariants apply (see /INVARIANTS.md)
- TIME_AXIS row `_napi` (1 anim sec ⇒ 50 µs, one NAPI poll budget).
- Connects sibling `01_network/02_nic/` ↔ sibling `02_netstack/` for RX. TX uses `[QDISC]` instead.
