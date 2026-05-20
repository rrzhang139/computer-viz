// LevelView state-machine tests. The actual r3f Canvas needs WebGL which jsdom
// doesn't provide, so we stub the level scenes to plain DOM markers.
//
// Tree: dff (depth 3, top) → latch (depth 2) → gate (depth 1, default landing) →
//       transistor (depth 0).

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';

type ZoomCB = (idx: number) => void;
type LatchZoomCB = (which: 'nand-1' | 'nand-2') => void;
type DffZoomCB = (which: 'master' | 'slave') => void;
let zoomCb: ZoomCB | null = null;
let arrivedCb: ZoomCB | null = null;
let latchZoomCb: LatchZoomCB | null = null;
let dffZoomCb: DffZoomCB | null = null;

vi.mock('./LevelDff', () => ({
  LevelDff: ({ onZoomToLatch }: { onZoomToLatch: DffZoomCB }) => {
    dffZoomCb = onZoomToLatch;
    return <div data-testid="stub-dff">stub-dff</div>;
  },
}));
vi.mock('./LevelLatch', () => ({
  LevelLatch: ({ onZoomToGate }: { onZoomToGate: LatchZoomCB }) => {
    latchZoomCb = onZoomToGate;
    return <div data-testid="stub-latch">stub-latch</div>;
  },
}));
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

const dffPane = () => screen.getByTestId('level-pane-dff');
const latchPane = () => screen.getByTestId('level-pane-latch');
const gatePane = () => screen.getByTestId('level-pane-gate');
const transistorPane = () => screen.getByTestId('level-pane-transistor');

describe('<LevelView>', () => {
  it('starts at the gate level (depth 1)', () => {
    render(<LevelView />);
    expect(gatePane()).toHaveAttribute('aria-hidden', 'false');
    expect(dffPane()).toHaveAttribute('aria-hidden', 'true');
    expect(latchPane()).toHaveAttribute('aria-hidden', 'true');
    expect(transistorPane()).toHaveAttribute('aria-hidden', 'true');
    expect(screen.getByTestId('level-breadcrumb')).toHaveTextContent(/level 1/i);
    expect(screen.getByTestId('level-breadcrumb')).toHaveTextContent(/Gate/);
  });

  it('all four panes are always mounted (cross-fade requires it)', () => {
    render(<LevelView />);
    expect(screen.getByTestId('stub-dff')).toBeInTheDocument();
    expect(screen.getByTestId('stub-latch')).toBeInTheDocument();
    expect(screen.getByTestId('stub-gate')).toBeInTheDocument();
    expect(screen.getByTestId('stub-transistor')).toBeInTheDocument();
  });

  it('back button is enabled at the gate level (parent: latch)', () => {
    render(<LevelView />);
    expect(screen.getByTestId('back')).toBeEnabled();
  });

  it('back from gate flips active pane to latch (depth 2)', () => {
    render(<LevelView />);
    fireEvent.click(screen.getByTestId('back'));
    expect(latchPane()).toHaveAttribute('aria-hidden', 'false');
    expect(gatePane()).toHaveAttribute('aria-hidden', 'true');
    expect(screen.getByTestId('level-breadcrumb')).toHaveTextContent(/level 2/i);
    expect(screen.getByTestId('level-breadcrumb')).toHaveTextContent(/Latch/);
  });

  it('back from latch flips active pane to dlatch (depth 3)', () => {
    render(<LevelView />);
    fireEvent.click(screen.getByTestId('back')); // gate → latch
    fireEvent.click(screen.getByTestId('back')); // latch → dlatch
    expect(screen.getByTestId('level-pane-dlatch')).toHaveAttribute('aria-hidden', 'false');
    expect(latchPane()).toHaveAttribute('aria-hidden', 'true');
    expect(screen.getByTestId('level-breadcrumb')).toHaveTextContent(/level 3/i);
    expect(screen.getByTestId('level-breadcrumb')).toHaveTextContent(/D Latch/);
  });

  it('back from dlatch flips active pane to dff (depth 4)', () => {
    render(<LevelView />);
    fireEvent.click(screen.getByTestId('back')); // gate → latch
    fireEvent.click(screen.getByTestId('back')); // latch → dlatch
    fireEvent.click(screen.getByTestId('back')); // dlatch → dff
    expect(dffPane()).toHaveAttribute('aria-hidden', 'false');
    expect(screen.getByTestId('level-breadcrumb')).toHaveTextContent(/level 4/i);
    expect(screen.getByTestId('level-breadcrumb')).toHaveTextContent(/Flip-Flop/);
  });

  it('back from the dff is disabled (it is the top of the tree)', () => {
    render(<LevelView />);
    fireEvent.click(screen.getByTestId('back')); // gate → latch
    fireEvent.click(screen.getByTestId('back')); // latch → dlatch
    fireEvent.click(screen.getByTestId('back')); // dlatch → dff
    expect(screen.getByTestId('back')).toBeDisabled();
  });

  it('clicking a NAND in the latch flips active pane to gate', () => {
    render(<LevelView />);
    fireEvent.click(screen.getByTestId('back')); // gate → latch
    act(() => latchZoomCb!('nand-1'));
    expect(gatePane()).toHaveAttribute('aria-hidden', 'false');
    expect(latchPane()).toHaveAttribute('aria-hidden', 'true');
  });

  it('clicking a latch in the dff flips active pane to dlatch', () => {
    render(<LevelView />);
    fireEvent.click(screen.getByTestId('back')); // gate → latch
    fireEvent.click(screen.getByTestId('back')); // latch → dlatch
    fireEvent.click(screen.getByTestId('back')); // dlatch → dff
    act(() => dffZoomCb!('master'));
    expect(screen.getByTestId('level-pane-dlatch')).toHaveAttribute('aria-hidden', 'false');
    expect(dffPane()).toHaveAttribute('aria-hidden', 'true');
  });

  it('onArrived(idx) flips active pane to transistor and updates breadcrumb', () => {
    render(<LevelView />);
    act(() => arrivedCb!(2));
    expect(transistorPane()).toHaveAttribute('aria-hidden', 'false');
    expect(gatePane()).toHaveAttribute('aria-hidden', 'true');
    expect(screen.getByTestId('level-breadcrumb')).toHaveTextContent(/level 0/i);
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

  it('Escape from gate goes up to the latch', () => {
    render(<LevelView />);
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(latchPane()).toHaveAttribute('aria-hidden', 'false');
  });

  it('Escape from latch goes up to dlatch', () => {
    render(<LevelView />);
    fireEvent.click(screen.getByTestId('back')); // gate → latch
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(screen.getByTestId('level-pane-dlatch')).toHaveAttribute('aria-hidden', 'false');
  });

  it('Escape on the dff is a no-op (already at the top)', () => {
    render(<LevelView />);
    fireEvent.click(screen.getByTestId('back')); // gate → latch
    fireEvent.click(screen.getByTestId('back')); // latch → dlatch
    fireEvent.click(screen.getByTestId('back')); // dlatch → dff
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(dffPane()).toHaveAttribute('aria-hidden', 'false');
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

  it('inactive panes have pointer-events: none so clicks fall through', () => {
    render(<LevelView />);
    expect(dffPane().style.pointerEvents).toBe('none');
    expect(latchPane().style.pointerEvents).toBe('none');
    expect(gatePane().style.pointerEvents).toBe('auto');
    expect(transistorPane().style.pointerEvents).toBe('none');
    act(() => arrivedCb!(0));
    expect(dffPane().style.pointerEvents).toBe('none');
    expect(latchPane().style.pointerEvents).toBe('none');
    expect(transistorPane().style.pointerEvents).toBe('auto');
    expect(gatePane().style.pointerEvents).toBe('none');
  });

  it('exposes step / play-pause / reset clock controls', () => {
    render(<LevelView />);
    expect(screen.getByTestId('step-cycle')).toHaveTextContent(/step/i);
    expect(screen.getByTestId('play-pause')).toHaveTextContent(/play|pause/i);
    expect(screen.getByTestId('reset-clock')).toHaveTextContent(/reset/i);
  });

  it('clicking play toggles aria-pressed', () => {
    render(<LevelView />);
    const playBtn = screen.getByTestId('play-pause');
    expect(playBtn).toHaveAttribute('aria-pressed', 'false');
    fireEvent.click(playBtn);
    expect(playBtn).toHaveAttribute('aria-pressed', 'true');
    expect(playBtn).toHaveTextContent(/pause/i);
    fireEvent.click(playBtn);
    expect(playBtn).toHaveAttribute('aria-pressed', 'false');
    expect(playBtn).toHaveTextContent(/play/i);
  });
});
