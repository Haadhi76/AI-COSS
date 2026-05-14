import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import MessageCard from '../components/MessageCard.jsx';

const base = {
  id: 1,
  channel: 'email',
  from: 'Sarah Chen <sarah.chen@meridianventures.com>',
  timestamp: '2026-03-18T08:12:00Z',
  body: 'b',
  reasoning: 'r',
  category: 'Decide',
  urgency: 4,
  flagged: false,
  department: 'Investors',
};

describe('MessageCard department capsule', () => {
  it('renders the department label', () => {
    render(<MessageCard message={base} onClick={() => {}} />);
    expect(screen.getByText('Investors')).toBeInTheDocument();
  });

  it('uses the same color for the same department across renders', () => {
    const { rerender } = render(<MessageCard message={base} onClick={() => {}} />);
    const first = screen.getByText('Investors').getAttribute('style');

    rerender(<MessageCard message={{ ...base, id: 2 }} onClick={() => {}} />);
    const second = screen.getByText('Investors').getAttribute('style');

    expect(first).toBe(second);
  });
});
