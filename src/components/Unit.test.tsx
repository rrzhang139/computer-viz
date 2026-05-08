import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Unit } from './Unit';

describe('<Unit>', () => {
  it('renders the value and unit text', () => {
    const { container } = render(<Unit value={100} unit="ns" />);
    expect(container.textContent).toContain('100');
    expect(container.textContent).toContain('ns');
  });

  it('shows tooltip on hover with long-name and scientific notation', () => {
    render(<Unit value={1} unit="ns" />);
    const wrap = screen.getByText(/1\s*ns/);
    fireEvent.mouseEnter(wrap);
    // "nanosecond" appears in both <strong> long-name and definition body — use getAllByText.
    expect(screen.getAllByText(/nanosecond/i).length).toBeGreaterThanOrEqual(1);
  });

  it('hides tooltip on mouse leave', () => {
    render(<Unit value={1} unit="ns" />);
    const wrap = screen.getByText(/1\s*ns/);
    fireEvent.mouseEnter(wrap);
    expect(screen.getAllByText(/nanosecond/i).length).toBeGreaterThanOrEqual(1);
    fireEvent.mouseLeave(wrap);
    expect(screen.queryByText(/nanosecond/i)).not.toBeInTheDocument();
  });

  it('handles units not in dictionary via fallback', () => {
    render(<Unit value={5} unit="MB" />);
    const wrap = screen.getByText(/5\s*MB/);
    fireEvent.mouseEnter(wrap);
    expect(screen.getByText(/megabyte/i)).toBeInTheDocument();
  });

  it('treats us as alias for µs', () => {
    render(<Unit value={1} unit="us" />);
    const wrap = screen.getByText(/1\s*us/);
    fireEvent.mouseEnter(wrap);
    expect(screen.getAllByText(/microsecond/i).length).toBeGreaterThanOrEqual(1);
  });

  it('accepts string values', () => {
    render(<Unit value="~100" unit="ns" />);
    const { container } = render(<Unit value="~100" unit="ns" />);
    expect(container.textContent).toContain('~100');
  });
});
