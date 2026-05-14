import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import Briefing from '../components/Briefing.jsx';

const briefing = {
  sections: [
    {
      title: 'Top Decisions Needed',
      items: [
        { message_id: 1, summary: 'Lock Series B meeting', action: 'Confirm Thu 2pm' },
        { message_id: 2, summary: 'Approve timeline fix', action: 'Sync with David' },
      ],
    },
    { title: 'Delegated Actions', items: [] },
    {
      title: 'Watch Items',
      items: [{ message_id: 5, summary: 'API migration ETA', action: 'Re-check Friday' }],
    },
    { title: 'Quick Wins', items: [] },
  ],
  generated_at: '2026-05-14T08:00:00Z',
};

describe('Briefing todo behaviour', () => {
  it('renders checkboxes on decision rows', () => {
    render(
      <Briefing
        briefing={briefing}
        loading={false}
        onJumpToTriage={() => {}}
        onOpenMessage={() => {}}
        noiseCount={0}
        completedIds={[]}
        daySummary={null}
        onToggle={() => {}}
      />,
    );
    expect(screen.getAllByRole('checkbox').length).toBe(2);
  });

  it('does not render checkboxes on watch items', () => {
    render(
      <Briefing
        briefing={briefing}
        loading={false}
        onJumpToTriage={() => {}}
        onOpenMessage={() => {}}
        noiseCount={0}
        completedIds={[]}
        daySummary={null}
        onToggle={() => {}}
      />,
    );
    const watchRow = screen.getByText('API migration ETA').closest('li');
    expect(within(watchRow).queryByRole('checkbox')).toBeNull();
  });

  it('calls onToggle with message_id when a checkbox is clicked', () => {
    const onToggle = vi.fn();
    render(
      <Briefing
        briefing={briefing}
        loading={false}
        onJumpToTriage={() => {}}
        onOpenMessage={() => {}}
        noiseCount={0}
        completedIds={[]}
        daySummary={null}
        onToggle={onToggle}
      />,
    );
    fireEvent.click(screen.getAllByRole('checkbox')[0]);
    expect(onToggle).toHaveBeenCalledWith(1);
  });

  it('renders a Done divider and sinks completed rows', () => {
    render(
      <Briefing
        briefing={briefing}
        loading={false}
        onJumpToTriage={() => {}}
        onOpenMessage={() => {}}
        noiseCount={0}
        completedIds={[1]}
        daySummary={null}
        onToggle={() => {}}
      />,
    );
    expect(screen.getByText(/Done · 1/i)).toBeInTheDocument();
  });

  it('renders DayWrapped when day_summary present', () => {
    render(
      <Briefing
        briefing={briefing}
        loading={false}
        onJumpToTriage={() => {}}
        onOpenMessage={() => {}}
        noiseCount={0}
        completedIds={[1, 2]}
        daySummary={{ bullets: ['Series B locked'] }}
        onToggle={() => {}}
      />,
    );
    expect(screen.getByText('Series B locked')).toBeInTheDocument();
  });
});
