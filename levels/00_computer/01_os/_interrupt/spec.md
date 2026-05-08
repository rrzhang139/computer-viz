# spec — 00_computer/01_os/_interrupt

> Phase 1. Level agent owns this file.

## Motivation (REQUIRED — one paragraph, no diagrams)

Devices like `[NIC]` and `[DISK]` finish work asynchronously — a packet arrives, an NVMe completion lands — and the CPU must respond without polling a busy loop. The interrupt is the inverse of `[SYSCALL]`: hardware *forces* a privilege transition into the kernel by asserting an external interrupt line, which the local CLINT/PLIC routes to a hart and traps via `mtvec` (with `mcause` MSB set). Without it, the kernel would have to spin-poll every device ring, burning cycles, or (worse) miss events. The cost is similar to a syscall (~100 cycles dispatch) plus whatever the ISR does, which is why drivers split work into a fast top-half (ack + queue) and deferred softirq/`[NAPI]` bottom-half.

## ROLE
Hardware-initiated S-mode entry: PLIC/CLINT raises a pending bit, `[CORE]` traps, kernel ISR runs, `SRET` resumes the interrupted context.

## MADE OF
1 PLIC source line per device + 1 CLINT timer/IPI per hart + `[TRAP]` dispatch + 1 ISR entry per `[DRV]`. Signals: `mip`/`mie` (pending/enable masks), `mcause` (with interrupt MSB set), `mepc` (interrupted PC), `sstatus.SIE` (S-mode interrupt enable). No physical wire — connector encodes the asynchronous edge.

## INPUTS
TOP: external IRQ line asserted by `[NIC]`/`[DISK]`/timer (kernel-mediated control). LEFT: device status from MMIO registers (drained by ISR).

## OUTPUTS
RIGHT: ISR ack + work item queued to softirq/`[NAPI]`/workqueue; previously-running thread's `[CTX]` resumed transparently.

## SYMBOL
`[IRQ]` (CONNECTOR — owns the device→kernel async edge).

## Notes
- this is a CONNECTOR (zoomable edge between siblings); owner = parent folder
- spatial invariants apply (see /INVARIANTS.md)
