# spec — 00_computer/01_os/02_driver

> Phase 1. Level agent owns this file.

## Motivation (REQUIRED — one paragraph, no diagrams)

Each peripheral (NVMe SSD, ethernet NIC, USB controller, GPU...) speaks its own register layout, command format, and completion protocol. A driver is the kernel-resident shim that knows that protocol: it probes the device on bus enumeration, registers an ops table with its subsystem (block / net / etc.), translates generic kernel requests into device-specific MMIO writes / `[DMA]` descriptors, and handles completion `[IRQ]`s. Without drivers, the kernel could not drive any concrete hardware — it'd be all interface, no mechanism.

## ROLE
Per-device kernel resident: probe + register ops table + handle requests via MMIO/DMA + service IRQs.

## MADE OF
1 `struct device` (from bus probe) + 1 ops table registered with subsystem (e.g. `nvme_ctrl_ops` to block layer; `net_device_ops` to net stack) + 1 ISR registered to `[IRQ]` line + per-device DMA descriptor rings.

## INPUTS
LEFT: requests from upstream subsystem (`[BLOCKQ]` request, `[NETSTACK]` skb, ...). TOP: bus-enumeration / probe events; `[IRQ]` from the device.

## OUTPUTS
RIGHT: MMIO writes + DMA descriptor placements that command the device; completions returned upstream after `[IRQ]` is serviced.

## SYMBOL
`[DRV]`

## Notes
- this is a NODE level
- spatial invariants apply (see /INVARIANTS.md)
