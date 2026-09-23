import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { Button } from './Button';

describe('Button', () => {
  it('prevents duplicate actions while loading', async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    const view = render(<Button onClick={onClick}>Save changes</Button>);

    await user.click(screen.getByRole('button', { name: 'Save changes' }));
    expect(onClick).toHaveBeenCalledTimes(1);

    view.rerender(
      <Button loading onClick={onClick}>
        Save changes
      </Button>
    );

    const loadingButton = screen.getByRole('button');
    expect(loadingButton).toBeDisabled();
    await user.click(loadingButton);
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('preserves explicit disabled state', () => {
    render(<Button disabled>Delete</Button>);

    expect(screen.getByRole('button', { name: 'Delete' })).toBeDisabled();
  });
});
