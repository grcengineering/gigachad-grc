import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import api from '@/lib/api';
import AIRiskAssistant from './AIRiskAssistant';

vi.mock('@/lib/api', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
  },
}));

function renderPage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <AIRiskAssistant />
    </QueryClientProvider>
  );
}

describe('AIRiskAssistant', () => {
  it('shows an explicit disabled state without sending stub output', async () => {
    vi.mocked(api.get).mockResolvedValue({
      data: {
        available: false,
        enabled: false,
        isMockMode: false,
        unavailableReason: 'AI features are disabled for this organization.',
        config: { provider: 'openai', model: 'gpt-4o' },
      },
    });

    renderPage();

    expect(await screen.findByText('AI assistant is disabled')).toBeVisible();
    expect(screen.getByRole('button', { name: 'Send' })).toBeDisabled();
    expect(api.post).not.toHaveBeenCalled();
  });
});
