import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';

describe('vitest setup', () => {
  it('renders text and asserts with jest-dom matchers', () => {
    render(<p>hello</p>);
    expect(screen.getByText('hello')).toBeInTheDocument();
  });
});
