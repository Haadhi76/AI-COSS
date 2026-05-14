import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import MessageFlyout from '../components/MessageFlyout.jsx';

const message = {
  id: 1,
  channel: 'email',
  from: 'Sarah Chen <sarah.chen@meridianventures.com>',
  subject: 'Series B',
  timestamp: '2026-03-18T08:12:00Z',
  body: 'Hello',
  reasoning: 'r',
  draft: 'd',
  category: 'Decide',
  urgency: 4,
  flagged: false,
  overridden: false,
  department: 'Investors',
};

describe('MessageFlyout category override', () => {
  it('renders three category buttons', () => {
    render(<MessageFlyout message={message} onClose={() => {}} onOverride={() => {}} />);
    expect(screen.getByRole('button', { name: 'Decide' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Delegate' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Ignore' })).toBeInTheDocument();
  });

  it('calls onOverride with new category when a different one is clicked', () => {
    const onOverride = vi.fn();
    render(<MessageFlyout message={message} onClose={() => {}} onOverride={onOverride} />);
    fireEvent.click(screen.getByRole('button', { name: 'Ignore' }));
    expect(onOverride).toHaveBeenCalledWith(1, 'Ignore');
  });

  it('calls onOverride with null when the active category is clicked', () => {
    const onOverride = vi.fn();
    render(
      <MessageFlyout
        message={{ ...message, overridden: true }}
        onClose={() => {}}
        onOverride={onOverride}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Decide' }));
    expect(onOverride).toHaveBeenCalledWith(1, null);
  });
});
