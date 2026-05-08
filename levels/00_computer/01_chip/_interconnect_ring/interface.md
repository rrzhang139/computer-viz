# interface — 00_computer/01_chip/_interconnect_ring

> Phase 1. **Owned by the PARENT folder.** Children import; only parent edits.

## Symbols this level emits UP

| symbol | meaning | latched on |
|---|---|---|
| ring-traffic | one flit traversing one hop | per cycle, per stop |
| coherence-msg | snoop / invalidate / response on the fabric | per coherent op |
| credit-stall | backpressure due to downstream-queue full | per cycle |

## Symbols this level expects DOWN

| symbol | meaning | producer (child folder) |
|---|---|---|
| `[CL]` | data-class flits carry cache-line payloads | `02_core/03_l1/04_cacheline/` |
| `[MESI]` | the coherence semantics of request/snoop/response classes | `02_core/03_l1/04_coherence/` |

## Cross-cutting refs

- Endpoints: every `[CORE]` (via its `[L2]`), every `[L3]` slice, `[MEMCTRL]`. The ring's `[DIR]` lookup happens at the LLC stop.
- Carries snoops that drive `[MESI]` transitions across cores.
- TIME_AXIS row: `_interconnect_ring` (1 anim sec ⇒ 1 cycle, latency is per-hop).
