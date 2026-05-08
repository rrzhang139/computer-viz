// LevelView state-machine tests. The actual r3f Canvas needs WebGL which jsdom
// doesn't provide, so we stub the level scenes to plain DOM markers.

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

vi.mock('./LevelTransistor', () => ({
  LevelTransistor: () => <div data-testid="stub-transistor">stub-transistor</div>,
}));
vi.mock('./LevelElectrons', () => ({
  LevelElectrons: () => <div data-testid="stub-electrons">stub-electrons</div>,
}));
// Motion AnimatePresence + motion.div: keep the children but skip animation.
vi.mock('motion/react', () => ({
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  motion: new Proxy(
    {},
    {
      get:
        () =>
        ({ children, ...props }: { children?: React.ReactNode; [k: string]: unknown }) => {
          // Drop framer-motion-only props (initial/animate/exit/transition) before forwarding
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

describe('<LevelView>', () => {
  it('starts at the transistor level', () => {
    render(<LevelView />);
    expect(screen.getByTestId('stub-transistor')).toBeInTheDocument();
    expect(screen.queryByTestId('stub-electrons')).not.toBeInTheDocument();
    expect(screen.getByTestId('level-breadcrumb')).toHaveTextContent(/level 7/i);
    expect(screen.getByTestId('level-breadcrumb')).toHaveTextContent(/Transistor/);
  });

  it('zoom in button is enabled at top, zoom out is disabled', () => {
    render(<LevelView />);
    expect(screen.getByTestId('zoom-in')).toBeEnabled();
    expect(screen.getByTestId('zoom-out')).toBeDisabled();
  });

  it('clicking zoom-in switches to electrons and updates breadcrumb', () => {
    render(<LevelView />);
    fireEvent.click(screen.getByTestId('zoom-in'));
    expect(screen.getByTestId('stub-electrons')).toBeInTheDocument();
    expect(screen.queryByTestId('stub-transistor')).not.toBeInTheDocument();
    expect(screen.getByTestId('level-breadcrumb')).toHaveTextContent(/level 8/i);
    expect(screen.getByTestId('level-breadcrumb')).toHaveTextContent(/Electrons/);
  });

  it('at electrons, zoom-in is disabled and zoom-out is enabled', () => {
    render(<LevelView />);
    fireEvent.click(screen.getByTestId('zoom-in'));
    expect(screen.getByTestId('zoom-in')).toBeDisabled();
    expect(screen.getByTestId('zoom-out')).toBeEnabled();
  });

  it('zoom-out from electrons returns to transistor', () => {
    render(<LevelView />);
    fireEvent.click(screen.getByTestId('zoom-in'));
    fireEvent.click(screen.getByTestId('zoom-out'));
    expect(screen.getByTestId('stub-transistor')).toBeInTheDocument();
    expect(screen.queryByTestId('stub-electrons')).not.toBeInTheDocument();
    expect(screen.getByTestId('level-breadcrumb')).toHaveTextContent(/Transistor/);
  });

  it('round-trip in→out→in lands back on electrons', () => {
    render(<LevelView />);
    fireEvent.click(screen.getByTestId('zoom-in'));
    fireEvent.click(screen.getByTestId('zoom-out'));
    fireEvent.click(screen.getByTestId('zoom-in'));
    expect(screen.getByTestId('stub-electrons')).toBeInTheDocument();
  });

  it('clicking disabled zoom-in at electrons is a no-op', () => {
    render(<LevelView />);
    fireEvent.click(screen.getByTestId('zoom-in')); // → electrons
    fireEvent.click(screen.getByTestId('zoom-in')); // disabled, no change
    expect(screen.getByTestId('stub-electrons')).toBeInTheDocument();
  });

  it('clicking disabled zoom-out at transistor is a no-op', () => {
    render(<LevelView />);
    fireEvent.click(screen.getByTestId('zoom-out')); // disabled, no change
    expect(screen.getByTestId('stub-transistor')).toBeInTheDocument();
  });

  it('exposes tick and µ-tick clock controls', () => {
    render(<LevelView />);
    expect(screen.getByTestId('step-cycle')).toHaveTextContent('tick');
    expect(screen.getByTestId('step-micro')).toHaveTextContent('µ-tick');
  });
});
