import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import api from '../lib/api';
import { saveBlob } from '../lib/download';
import RiskReports, { getDownloadFilename } from './RiskReports';

vi.mock('../lib/api', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
  },
  risksApi: {
    getDashboard: vi.fn().mockResolvedValue({ data: {} }),
    getTrend: vi.fn().mockResolvedValue({ data: [] }),
  },
}));

vi.mock('../lib/download', () => ({
  saveBlob: vi.fn(),
}));

function renderPage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <RiskReports />
    </QueryClientProvider>
  );
}

describe('RiskReports', () => {
  beforeEach(() => {
    vi.mocked(api.get).mockResolvedValue({ data: { risks: [] } });
    vi.mocked(api.post).mockResolvedValue({
      data: new Blob(['pdf'], { type: 'application/pdf' }),
      headers: { 'content-disposition': 'attachment; filename="risk-register.pdf"' },
    });
  });

  it('exports through the authenticated reports API', async () => {
    renderPage();

    fireEvent.click(screen.getByText('Full Risk Register'));
    fireEvent.click(await screen.findByRole('button', { name: 'Export Report' }));

    await waitFor(() =>
      expect(api.post).toHaveBeenCalledWith(
        '/api/reports/generate',
        expect.objectContaining({ reportType: 'risk_register' }),
        { responseType: 'blob' }
      )
    );
    expect(saveBlob).toHaveBeenCalledWith(expect.any(Blob), 'risk-register.pdf');
  });

  it('parses encoded and quoted download filenames', () => {
    expect(
      getDownloadFilename("attachment; filename*=UTF-8''risk%20trends.pdf", 'fallback.pdf')
    ).toBe('risk trends.pdf');
    expect(getDownloadFilename('attachment; filename="risk.pdf"', 'fallback.pdf')).toBe('risk.pdf');
  });
});
