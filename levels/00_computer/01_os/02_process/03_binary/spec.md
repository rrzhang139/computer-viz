# spec — 00_computer/01_os/02_process/03_binary

> Phase 1. Level agent owns this file.

## Motivation (REQUIRED — one paragraph, no diagrams)

The CODE region of a `[PROC]` doesn't appear by magic — it comes from a file on disk built by a compiler. The ELF binary is the OS's standard format for "here is machine code + initialized data + symbols + relocations + which `.so`s I depend on." `execve` mmaps the ELF's `.text` into CODE, `.rodata`/`.data` into DATA, allocates `.bss` (zero-fill), then resolves dynamic linkage via the GOT/PLT so the same binary works across processes that share libc. Without ELF, every loader would re-invent layout, dynamic linking, and ASLR; debug info would be unstandardized.

## ROLE
The on-disk format and in-memory layout for executable code: ELF segments → mapped VMAs inside `[PROC]`'s CODE/DATA/BSS regions.

## MADE OF
1 ELF header + N program headers (`PT_LOAD` segments) → mapped to CODE (`.text`, RX), DATA (`.data` RW + `.rodata` R + `.bss` RW zero-fill); plus M shared libraries (`libc.so`, `libpython.so`...) each contributing additional `PT_LOAD`s. GOT (per-DSO data) + PLT (per-DSO trampolines) wire cross-DSO calls.

## INPUTS
TOP: `execve(path, argv, envp)` syscall, dynamic-linker invocations. LEFT: ELF file bytes streamed from `[VFS]` → `[PCACHE]` (lazily via `[MMAP]`).

## OUTPUTS
RIGHT: `[PROC]` ready to run with `pc` set to ELF entry; subsequent instruction fetches by `[CORE]` resolve into `.text` pages.

## SYMBOL
`[BIN]`

## Notes
- this is a NODE level
- spatial invariants apply (see /INVARIANTS.md)
