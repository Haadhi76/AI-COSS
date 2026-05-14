import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import StatBar from '../components/StatBar.jsx';

const counts = { total: 0, decide: 0, delegate: 0, flagged: 0 };

describe('StatBar regenerate button', () => {
  it('does not render the regenerate button when onRegenerate is omitted', () => {
    render(<StatBar counts={counts} title="Morning Briefing" />);
    expect(screen.queryByRole('button', { name: /regenerate/i })).toBeNull();
  });

  it('renders a regenerate button next to the title when onRegenerate is provided', () => {
    render(
      <StatBar counts={counts} title="Morning Briefing" onRegenerate={() => {}} />,
    );
    const button = screen.getByRole('button', { name: /regenerate/i });
    expect(button).toBeInTheDocument();
  });

  it('invokes onRegenerate when the button is clicked', () => {
    const onRegenerate = vi.fn();
    render(
      <StatBar counts={counts} title="Morning Briefing" onRegenerate={onRegenerate} />,
    );
    fireEvent.click(screen.getByRole('button', { name: /regenerate/i }));
    expect(onRegenerate).toHaveBeenCalledTimes(1);
  });

  it('disables the button while regenerating', () => {
    render(
      <StatBar
        counts={counts}
        title="Morning Briefing"
        onRegenerate={() => {}}
        regenerating
      />,
    );
    expect(screen.getByRole('button', { name: /regenerate/i })).toBeDisabled();
  });
});
