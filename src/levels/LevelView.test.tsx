// LevelView state-machine tests. The actual r3f Canvas needs WebGL which jsdom
// doesn't provide, so we stub the level scenes to plain DOM markers.
//
// New interaction model: clicking a MOSFET (proxied via onZoomTo) starts a
// camera fly-in; once arrived (proxied via onArrived), level switches.
// Going back uses the "back" button or Escape key.

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';

// Capture the props LevelTransistor receives so the test can fire onZoomTo /
// onArrived directly without simulating the camera fly.
type ZoomCB = (idx: number) => void;
let zoomCb: ZoomCB | null = null;
let arrivedCb: ZoomCB | null = null;

vi.mock('./LevelTransistor', () => ({
  LevelTransistor: ({ onZoomTo, onArrived }: { onZoomTo: ZoomCB; onArrived: ZoomCB }) => {
    zoomCb = onZoomTo;
    arrivedCb = onArrived;
    return <div data-testid="stub-transistor">stub-transistor</div>;
  },
}));
vi.mock('./LevelElectrons', () => ({
  LevelElectrons: () => <div data-testid="stub-electrons">stub-electrons</div>,
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

const transistorPane = () => screen.getByTestId('level-pane-transistor');
const electronsPane = () => screen.getByTestId('level-pane-electrons');

describe('<LevelView>', () => {
  it('starts at the transistor level', () => {
    render(<LevelView />);
    expect(transistorPane()).toHaveAttribute('aria-hidden', 'false');
    expect(electronsPane()).toHaveAttribute('aria-hidden', 'true');
    expect(screen.getByTestId('level-breadcrumb')).toHaveTextContent(/level 7/i);
    expect(screen.getByTestId('level-breadcrumb')).toHaveTextContent(/Transistor/);
  });

  it('both panes are always mounted (cross-fade requires it)', () => {
    render(<LevelView />);
    expect(screen.getByTestId('stub-transistor')).toBeInTheDocument();
    expect(screen.getByTestId('stub-electrons')).toBeInTheDocument();
  });

  it('back button is disabled at the transistor level', () => {
    render(<LevelView />);
    expect(screen.getByTestId('back')).toBeDisabled();
  });

  it('onArrived(idx) flips active pane to electrons and updates breadcrumb', () => {
    render(<LevelView />);
    act(() => arrivedCb!(2));
    expect(electronsPane()).toHaveAttribute('aria-hidden', 'false');
    expect(transistorPane()).toHaveAttribute('aria-hidden', 'true');
    expect(screen.getByTestId('level-breadcrumb')).toHaveTextContent(/level 8/i);
    expect(screen.getByTestId('level-breadcrumb')).toHaveTextContent(/Electrons/);
  });

  it('back button enabled on electrons; clicking returns to transistor', () => {
    render(<LevelView />);
    act(() => arrivedCb!(2));
    expect(screen.getByTestId('back')).toBeEnabled();
    fireEvent.click(screen.getByTestId('back'));
    expect(transistorPane()).toHaveAttribute('aria-hidden', 'false');
    expect(electronsPane()).toHaveAttribute('aria-hidden', 'true');
  });

  it('Escape from electrons returns to transistor', () => {
    render(<LevelView />);
    act(() => arrivedCb!(2));
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(transistorPane()).toHaveAttribute('aria-hidden', 'false');
  });

  it('Escape on transistor is a no-op', () => {
    render(<LevelView />);
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(transistorPane()).toHaveAttribute('aria-hidden', 'false');
  });

  it('onZoomTo alone does not change the level (camera must arrive first)', () => {
    render(<LevelView />);
    act(() => zoomCb!(2));
    expect(transistorPane()).toHaveAttribute('aria-hidden', 'false');
    expect(electronsPane()).toHaveAttribute('aria-hidden', 'true');
  });

  it('onZoomTo then onArrived is the full sequence', () => {
    render(<LevelView />);
    act(() => zoomCb!(1));
    act(() => arrivedCb!(1));
    expect(electronsPane()).toHaveAttribute('aria-hidden', 'false');
  });

  it('inactive pane has pointer-events: none so clicks fall through', () => {
    render(<LevelView />);
    expect(electronsPane().style.pointerEvents).toBe('none');
    expect(transistorPane().style.pointerEvents).toBe('auto');
    act(() => arrivedCb!(0));
    expect(electronsPane().style.pointerEvents).toBe('auto');
    expect(transistorPane().style.pointerEvents).toBe('none');
  });

  it('exposes tick and µ-tick clock controls', () => {
    render(<LevelView />);
    expect(screen.getByTestId('step-cycle')).toHaveTextContent('tick');
    expect(screen.getByTestId('step-micro')).toHaveTextContent('µ-tick');
  });
});
