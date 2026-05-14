import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import DayWrapped from '../components/DayWrapped.jsx';

describe('DayWrapped', () => {
  it('renders each bullet', () => {
    render(<DayWrapped bullets={['Closed Series B', 'Followed up with Horizon']} />);
    expect(screen.getByText('Closed Series B')).toBeInTheDocument();
    expect(screen.getByText('Followed up with Horizon')).toBeInTheDocument();
  });

  it('renders nothing when bullets is empty', () => {
    const { container } = render(<DayWrapped bullets={[]} />);
    expect(container.firstChild).toBeNull();
  });
});
