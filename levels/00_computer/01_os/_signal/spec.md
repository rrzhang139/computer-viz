# spec — 00_computer/01_os/_signal

> Phase 1. Level agent owns this file.

## Motivation (REQUIRED — one paragraph, no diagrams)

The kernel sometimes needs to interrupt a `[THREAD]` *asynchronously* — to deliver SIGSEGV after a bad pointer, SIGCHLD when a child exits, SIGTERM from `kill`, SIGINT from Ctrl-C. A normal function call cannot do this because the target thread did not call into the kernel; it was just running its own code. `[SIG]` is the kernel→user upcall that solves this: on the next syscall-return or interrupt-return into user mode, the kernel checks the thread's pending-signal mask, and if a signal is pending, instead of returning to the saved PC it splices a *signal frame* onto the user stack and jumps to the registered handler. Without `[SIG]`, there would be no way for one process to notify another, no SEGV-on-fault, no Ctrl-C, no graceful child reaping.

## ROLE
Deliver an asynchronous notification (signal number) from kernel to a `[THREAD]` by pushing a signal frame on its user stack and redirecting its PC to the user-registered handler; on `sigreturn`, restore the saved registers and resume the original code.

## MADE OF
1 per-thread `pending` signal mask (64-bit set) + 1 per-process `sigaction` table (handler + flags + mask per signal) + the signal-frame template that lands on the user stack (saved registers + ucontext + trampoline). Signals: 64 standard + RT signals; protocol: SIGNAL/SIGRETURN handshake using the per-thread `[CTX]`. Physical medium: kernel code running during syscall/interrupt-return.

## INPUTS
- LEFT (data): signal sources — `kill()` syscall, fault detected by `[TRAP]` (SIGSEGV/SIGBUS/SIGFPE), child exit (SIGCHLD), tty (SIGINT), timers (SIGALRM).
- TOP (control): "are we returning to user mode?" check at every syscall/interrupt-exit; only at that moment does the kernel splice the frame.

## OUTPUTS
- RIGHT: a signal frame pushed on the target `[THREAD]`'s user stack, the thread's PC redirected to the handler; on handler return, `sigreturn` syscall pops the frame and resumes original execution.

## SYMBOL
`[SIG]`

## Notes
- this is a CONNECTOR (zoomable edge between siblings); owner = parent folder `01_os/`
- spatial invariants apply (see /INVARIANTS.md)
- TIME_AXIS row `_signal` (1 anim sec ⇒ 1 frame-push or handler-entry step).
- Connects kernel notification sources ↔ user-space `[THREAD]` execution.
