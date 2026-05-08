# spec — 00_computer/01_chip/02_core/03_csr

> Phase 1. Level agent owns this file.

## Motivation (REQUIRED — one paragraph, no diagrams)

The architectural [REG] file holds program data, but the *machine itself* needs status: current privilege mode, trap vector base, saved PC, interrupt mask, page-table root pointer, performance counters, hart ID, etc. The CSR space is a separate 12-bit-addressable register file accessed by `csrr`/`csrw`/`csrrw` and implicitly by [TRAP]. Each CSR has its own access permissions (which privilege levels may read/write) and side effects (writing `satp` invalidates the [TLB]). Without it, OS and the privileged spec have nowhere to live in hardware.

## ROLE
RISC-V control/status register file (mstatus, mcause, mtvec, mepc, mip, mie, satp, etc.).

## MADE OF
<!-- count + (previous-level symbol). For connectors: signals/protocol + physical medium. -->
A small bank of [REG] cells (one per defined CSR), an address-decoder [G] tree mapping the 12-bit CSR-addr → register-select, and a permission-check [G] stage gated by current `privMode`.

## INPUTS
<!-- LEFT (data) or TOP (control) -->
- LEFT: write data from `csrrw` instruction or implicit writes from [TRAP]; read-port address.
- TOP: [CLK]; current `privMode`; access-type bits (csrrw/csrrs/csrrc).

## OUTPUTS
<!-- RIGHT -->
- RIGHT: read-data to register-write port (typical csrr returns old value); side-effect signals (e.g., satp-write triggers TLB flush, mstatus-write may change interrupt enable).

## SYMBOL
<!-- bracketed token. None for connectors. -->
[CSR]

## Notes
- this is a NODE level
- spatial invariants apply (see /INVARIANTS.md)
