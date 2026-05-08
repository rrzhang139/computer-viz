# spec — 00_computer/01_chip/_interconnect_ring

> Phase 1. Level agent owns this file.

## Motivation (REQUIRED — one paragraph, no diagrams)

The on-die ring/mesh exists because the cores, LLC slices, and memory controller are *physically apart* on the silicon and need a shared bandwidth-fabric to talk. A point-to-point web would scale O(N²); a single shared bus would saturate. A ring (or 2D mesh on bigger chips) lets every stop talk to every other in O(N) hops with bounded latency, predictable arbitration, and built-in ordering points for coherence. Without it, cross-core coherence and LLC access would either be a bus bottleneck or an unconstrained tangle of wires. This is also where snoop messages, fill responses, and writebacks all share the same medium.

## ROLE
On-die fabric carrying coherence + data messages between every `[CORE]`, every `[L3]` slice, and `[MEMCTRL]`. Provides ordering, arbitration, and routing.

## MADE OF
- **Signals/protocol:** request, snoop, response, and data classes (per-class virtual channels for deadlock freedom); coherence ops carry `[MESI]` semantics; data flits carry `[CL]` payloads.
- **Physical medium:** on-die metal traces wired stop-to-stop around the core+L3 grid (ring) or in a row/column mesh on larger chips; each stop has a small router with input queues and a flit-based crossbar.
- N+M ring stops (one per `[CORE]`, one per `[L3]` slice, one per `[MEMCTRL]`).

## INPUTS
- LEFT (data): outbound L1/L2 misses; LLC fill responses; coherence requests/snoop responses from each stop's local agent.
- TOP (control): clock from `[CLK]`, arbitration tokens, virtual-channel credits, fence/ordering markers.

## OUTPUTS
- RIGHT: forwarded flits to the next ring hop or to the destination stop's local agent; backpressure to the source when downstream queue is full.

## SYMBOL
(none — connector)

## Notes
- this is a CONNECTOR (zoomable edge between siblings); owner = parent folder
- spatial invariants apply (see /INVARIANTS.md)
