// LevelView state-machine tests. The actual r3f Canvas needs WebGL which jsdom
// doesn't provide, so we stub the level scenes to plain DOM markers.
//
// Levels: gate (depth 6, default landing) and transistor (depth 7).

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';

type ZoomCB = (idx: number) => void;
let zoomCb: ZoomCB | null = null;
let arrivedCb: ZoomCB | null = null;

vi.mock('./LevelGate', () => ({
  LevelGate: ({ onZoomTo, onArrived }: { onZoomTo: ZoomCB; onArrived: ZoomCB }) => {
    zoomCb = onZoomTo;
    arrivedCb = onArrived;
    return <div data-testid="stub-gate">stub-gate</div>;
  },
}));
vi.mock('./LevelTransistor', () => ({
  LevelTransistor: ({ highlight }: { highlight: unknown }) => (
    <div data-testid="stub-transistor">stub-transistor highlight={String(highlight)}</div>
  ),
}));
vi.mock('motion/react', () => ({
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  motion: new Proxy(
    {},
    {
      get:
        () =>
        ({ children, ...props }: { children?: React.ReactNode; [k: string]: unknown }) => {
          const dropKeys = new Set(['initial', 'animate', 'exit', 'transition']);
          const rest: Record<string, unknown> = {};
          for (const [k, v] of Object.entries(props)) {
            if (!dropKeys.has(k)) rest[k] = v;
          }
          return <div {...rest}>{children}</div>;
        },
    }
  ),
}));

import { LevelView } from './LevelView';

const gatePane = () => screen.getByTestId('level-pane-gate');
const transistorPane = () => screen.getByTestId('level-pane-transistor');

describe('<LevelView>', () => {
  it('starts at the gate level (depth 6)', () => {
    render(<LevelView />);
    expect(gatePane()).toHaveAttribute('aria-hidden', 'false');
    expect(transistorPane()).toHaveAttribute('aria-hidden', 'true');
    expect(screen.getByTestId('level-breadcrumb')).toHaveTextContent(/level 6/i);
    expect(screen.getByTestId('level-breadcrumb')).toHaveTextContent(/Gate/);
  });

  it('both panes are always mounted (cross-fade requires it)', () => {
    render(<LevelView />);
    expect(screen.getByTestId('stub-gate')).toBeInTheDocument();
    expect(screen.getByTestId('stub-transistor')).toBeInTheDocument();
  });

  it('back button is disabled at the gate level', () => {
    render(<LevelView />);
    expect(screen.getByTestId('back')).toBeDisabled();
  });

  it('onArrived(idx) flips active pane to transistor and updates breadcrumb', () => {
    render(<LevelView />);
    act(() => arrivedCb!(2));
    expect(transistorPane()).toHaveAttribute('aria-hidden', 'false');
    expect(gatePane()).toHaveAttribute('aria-hidden', 'true');
    expect(screen.getByTestId('level-breadcrumb')).toHaveTextContent(/level 7/i);
    expect(screen.getByTestId('level-breadcrumb')).toHaveTextContent(/Transistor/);
  });

  it('back button enabled on transistor; clicking returns to gate', () => {
    render(<LevelView />);
    act(() => arrivedCb!(2));
    expect(screen.getByTestId('back')).toBeEnabled();
    fireEvent.click(screen.getByTestId('back'));
    expect(gatePane()).toHaveAttribute('aria-hidden', 'false');
    expect(transistorPane()).toHaveAttribute('aria-hidden', 'true');
  });

  it('Escape from transistor returns to gate', () => {
    render(<LevelView />);
    act(() => arrivedCb!(2));
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(gatePane()).toHaveAttribute('aria-hidden', 'false');
  });

  it('Escape on gate is a no-op', () => {
    render(<LevelView />);
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(gatePane()).toHaveAttribute('aria-hidden', 'false');
  });

  it('onZoomTo alone does not change the level (camera must arrive first)', () => {
    render(<LevelView />);
    act(() => zoomCb!(2));
    expect(gatePane()).toHaveAttribute('aria-hidden', 'false');
    expect(transistorPane()).toHaveAttribute('aria-hidden', 'true');
  });

  it('onZoomTo then onArrived is the full sequence', () => {
    render(<LevelView />);
    act(() => zoomCb!(1));
    act(() => arrivedCb!(1));
    expect(transistorPane()).toHaveAttribute('aria-hidden', 'false');
  });

  it('inactive pane has pointer-events: none so clicks fall through', () => {
    render(<LevelView />);
    expect(transistorPane().style.pointerEvents).toBe('none');
    expect(gatePane().style.pointerEvents).toBe('auto');
    act(() => arrivedCb!(0));
    expect(transistorPane().style.pointerEvents).toBe('auto');
    expect(gatePane().style.pointerEvents).toBe('none');
  });

  it('exposes tick and µ-tick clock controls', () => {
    render(<LevelView />);
    expect(screen.getByTestId('step-cycle')).toHaveTextContent('tick');
    expect(screen.getByTestId('step-micro')).toHaveTextContent('µ-tick');
  });
});
