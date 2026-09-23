import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { ThemeProvider, useTheme } from './ThemeContext';

function ThemeHarness() {
  const { theme, resolvedTheme, setTheme } = useTheme();

  return (
    <>
      <output aria-label="selected theme">{theme}</output>
      <output aria-label="resolved theme">{resolvedTheme}</output>
      <button type="button" onClick={() => setTheme('dark')}>
        Use dark theme
      </button>
    </>
  );
}

describe('ThemeProvider', () => {
  it('restores a stored theme and applies it to the document', async () => {
    localStorage.setItem('theme', 'dark');

    render(
      <ThemeProvider>
        <ThemeHarness />
      </ThemeProvider>
    );

    expect(screen.getByLabelText('selected theme')).toHaveTextContent('dark');
    expect(screen.getByLabelText('resolved theme')).toHaveTextContent('dark');
    await waitFor(() => expect(document.documentElement).toHaveClass('dark'));
  });

  it('persists a user selection across provider remounts', async () => {
    const user = userEvent.setup();
    const view = render(
      <ThemeProvider>
        <ThemeHarness />
      </ThemeProvider>
    );

    await user.click(screen.getByRole('button', { name: 'Use dark theme' }));

    expect(localStorage.getItem('theme')).toBe('dark');
    await waitFor(() => expect(document.documentElement).toHaveClass('dark'));

    view.unmount();
    render(
      <ThemeProvider>
        <ThemeHarness />
      </ThemeProvider>
    );

    expect(screen.getByLabelText('selected theme')).toHaveTextContent('dark');
    expect(screen.getByLabelText('resolved theme')).toHaveTextContent('dark');
  });
});
