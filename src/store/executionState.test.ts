import { describe, it, expect, beforeEach } from 'vitest';
import { useExecution } from './executionState';

describe('executionState store', () => {
  beforeEach(() => {
    useExecution.getState().reset();
  });

  it('initializes with PC=0, cycle=0, no retired instructions', () => {
    const s = useExecution.getState();
    expect(s.pc).toBe(0);
    expect(s.cycle).toBe(0);
    expect(s.retiredInstrs).toBe(0);
    expect(s.paused).toBe(true);
    expect(s.privMode).toBe('U');
  });

  it('step() advances retiredInstrs by 1 and cycle by 5', () => {
    useExecution.getState().step();
    const s = useExecution.getState();
    expect(s.retiredInstrs).toBe(1);
    expect(s.cycle).toBe(5);
  });

  it('stepCycle() advances cycle by 1, leaves retired untouched', () => {
    useExecution.getState().stepCycle();
    const s = useExecution.getState();
    expect(s.cycle).toBe(1);
    expect(s.retiredInstrs).toBe(0);
  });

  it('stepMicro() advances microStep', () => {
    useExecution.getState().stepMicro();
    useExecution.getState().stepMicro();
    expect(useExecution.getState().microStep).toBe(2);
  });

  it('play() / pause() toggle paused', () => {
    useExecution.getState().play();
    expect(useExecution.getState().paused).toBe(false);
    useExecution.getState().pause();
    expect(useExecution.getState().paused).toBe(true);
  });

  it('setPlaybackRate() updates rate', () => {
    useExecution.getState().setPlaybackRate(0.25);
    expect(useExecution.getState().playbackRate).toBe(0.25);
  });

  it('reset() restores initial state', () => {
    const s = useExecution.getState();
    s.step();
    s.stepCycle();
    s.play();
    s.setPlaybackRate(2);
    s.reset();
    const after = useExecution.getState();
    expect(after.cycle).toBe(0);
    expect(after.retiredInstrs).toBe(0);
    expect(after.paused).toBe(true);
    expect(after.playbackRate).toBe(1.0);
  });

  it('multiple step() calls accumulate', () => {
    const s = useExecution.getState();
    s.step();
    s.step();
    s.step();
    const after = useExecution.getState();
    expect(after.retiredInstrs).toBe(3);
    expect(after.cycle).toBe(15);
  });
});
