# DESIGN_OPEN — questions awaiting an owner

Agents claim a row by writing their handle in the `owner` column. Resolved questions move to `COORDINATOR_LOG.md`.

| # | Question | Scope | Owner | Status |
|---|---|---|---|---|
| 1 | Should the ethernet link's deepest zoom show *only* electron drift in copper, or also include EM field propagation? Latter is more accurate but harder to render cleanly. | `_ethernet_link/03_signal_on_wire/` | — | open |
| 2 | At gate level, do we render NMOS+PMOS separately or just the abstract switch? User asked for transistor realism but also intuition. | `06_gate/`, `07_transistor/` | — | open |
| 3 | The PC bird's-eye photo overlay: source a stock CC image, or generate one? Need: open ATX case with CPU, RAM, GPU, NVMe, NIC clearly visible. | `00_computer/assets/` | — | open |
| 4 | Should syscall path show full trap-handler register-save-and-restore, or just the conceptual transition? | `_syscall/` | — | open |
| 5 | RV32I has no FPU; should the ALU level mention it as future-work or stay strictly integer? | `03_alu/` | — | open |
| 6 | The interconnect ring connector: is it visible only at chip level, or do core-level diagrams also show stubs? | `_interconnect_ring/` | — | open |
| 7 | When stepping a `sw` instruction, the highlight visits L1→L2→L3→RAM only on cache miss. For the demo, do we engineer a deliberate miss, or only show hits in V1? | `02_core/`, `01_chip/02_l3/` | — | open |
| 8 | Should the user be able to *edit* the assembly snippet, or is it a fixed example for V1? | top bar / `05_integrate` | — | open |
