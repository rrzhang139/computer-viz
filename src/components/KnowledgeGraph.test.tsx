import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { KnowledgeGraph } from './KnowledgeGraph';

// Mock @xyflow/react: jsdom doesn't implement ResizeObserver and we don't
// need to test the third-party graph rendering.
vi.mock('@xyflow/react', () => ({
  ReactFlow: ({ children }: { children?: React.ReactNode }) => (
    <div data-testid="reactflow-stub">{children}</div>
  ),
  Background: () => <div />,
  Controls: () => <div />,
}));

describe('<KnowledgeGraph>', () => {
  it('renders nothing when closed', () => {
    const { container } = render(
      <KnowledgeGraph open={false} onClose={() => {}} onNavigate={() => {}} />
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders modal when open', () => {
    render(
      <KnowledgeGraph open onClose={() => {}} onNavigate={() => {}} />
    );
    expect(screen.getByRole('dialog', { name: /knowledge graph/i })).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/search/i)).toBeInTheDocument();
  });

  it('default view is tree with all 115 levels', () => {
    render(
      <KnowledgeGraph open onClose={() => {}} onNavigate={() => {}} />
    );
    // Root node visible
    expect(screen.getByText(/00_computer/)).toBeInTheDocument();
    // Some deep leaf visible (tree expanded by default)
    expect(screen.getByText(/08_electrons/)).toBeInTheDocument();
  });

  it('search filters tree to matching ancestors', () => {
    render(
      <KnowledgeGraph open onClose={() => {}} onNavigate={() => {}} />
    );
    const search = screen.getByPlaceholderText(/search/i);
    fireEvent.change(search, { target: { value: 'electrons' } });
    expect(screen.getByText(/08_electrons/)).toBeInTheDocument();
    // unrelated node should be filtered out
    expect(screen.queryByText(/02_thread/)).not.toBeInTheDocument();
  });

  it('clicking a tree node calls onNavigate with the level id', () => {
    const onNavigate = vi.fn();
    render(
      <KnowledgeGraph open onClose={() => {}} onNavigate={onNavigate} />
    );
    fireEvent.click(screen.getByText(/00_computer/));
    expect(onNavigate).toHaveBeenCalledWith('00_computer');
  });

  it('X button calls onClose', () => {
    const onClose = vi.fn();
    render(
      <KnowledgeGraph open onClose={onClose} onNavigate={() => {}} />
    );
    fireEvent.click(screen.getByLabelText(/close/i));
    expect(onClose).toHaveBeenCalled();
  });

  it('Esc key calls onClose', () => {
    const onClose = vi.fn();
    render(
      <KnowledgeGraph open onClose={onClose} onNavigate={() => {}} />
    );
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onClose).toHaveBeenCalled();
  });

  it('clicking the backdrop calls onClose', () => {
    const onClose = vi.fn();
    render(
      <KnowledgeGraph open onClose={onClose} onNavigate={() => {}} />
    );
    const dialog = screen.getByRole('dialog');
    // dialog wrapper IS the backdrop in our impl
    fireEvent.click(dialog);
    expect(onClose).toHaveBeenCalled();
  });

  it('toggling to graph view renders the react-flow container', () => {
    render(
      <KnowledgeGraph open onClose={() => {}} onNavigate={() => {}} />
    );
    fireEvent.click(screen.getByRole('button', { name: 'graph' }));
    expect(screen.getByTestId('reactflow-stub')).toBeInTheDocument();
  });
});
