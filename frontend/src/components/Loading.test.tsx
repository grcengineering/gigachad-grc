import { describe, it, expect } from 'vitest';
import { render, screen } from '@/test/utils';
import Loading from './Loading';

describe('Loading', () => {
  it('renders loading spinner', () => {
    render(<Loading />);

    // Look for the spinner element (has animate-spin class)
    const spinner = document.querySelector('[class*="animate-spin"]');
    expect(spinner).toBeInTheDocument();
  });

  it('renders default loading text', () => {
    render(<Loading />);

    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('renders with min-h-screen class', () => {
    const { container } = render(<Loading />);

    expect(container.firstChild).toHaveClass('min-h-screen');
  });

  it('renders centered content', () => {
    const { container } = render(<Loading />);

    expect(container.firstChild).toHaveClass('flex');
    expect(container.firstChild).toHaveClass('items-center');
    expect(container.firstChild).toHaveClass('justify-center');
  });

  it('has proper background', () => {
    const { container } = render(<Loading />);

    expect(container.firstChild).toHaveClass('bg-surface-50');
  });
});
