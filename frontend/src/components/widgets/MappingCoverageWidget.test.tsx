import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@/test/utils';

import { MappingCoverageWidget } from './MappingCoverageWidget';

vi.mock('@/lib/api/frameworks.api', () => ({
  frameworksApi: {
    mappings: {
      getControlCoverage: vi.fn(),
      getRequirementCoverage: vi.fn(),
    },
  },
}));

import { frameworksApi } from '@/lib/api/frameworks.api';

describe('MappingCoverageWidget', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders aggregate mode with mocked control coverage data', async () => {
    vi.mocked(frameworksApi.mappings.getControlCoverage).mockResolvedValue({
      totalControls: 40,
      mappedControls: 30,
      unmappedControls: 10,
      coveragePercent: 75,
    } as never);

    render(<MappingCoverageWidget />);

    expect(await screen.findByText('75%')).toBeInTheDocument();
    expect(screen.getByText(/30 of 40 mapped/)).toBeInTheDocument();
    expect(screen.getByText(/10 unmapped/)).toBeInTheDocument();
    expect(frameworksApi.mappings.getControlCoverage).toHaveBeenCalled();
    expect(frameworksApi.mappings.getRequirementCoverage).not.toHaveBeenCalled();
  });

  it('renders per-framework mode with mocked requirement coverage data', async () => {
    vi.mocked(frameworksApi.mappings.getRequirementCoverage).mockResolvedValue({
      totalRequirements: 20,
      mappedRequirements: 18,
      unmappedRequirements: 2,
      coveragePercent: 90,
    } as never);

    render(<MappingCoverageWidget frameworkId="fw-1" />);

    expect(await screen.findByText('90%')).toBeInTheDocument();
    expect(screen.getByText(/18 of 20 mapped, 2 with no controls/)).toBeInTheDocument();
    expect(frameworksApi.mappings.getRequirementCoverage).toHaveBeenCalledWith('fw-1');
    expect(frameworksApi.mappings.getControlCoverage).not.toHaveBeenCalled();
  });

  it('renders zero state when totals are 0', async () => {
    vi.mocked(frameworksApi.mappings.getControlCoverage).mockResolvedValue({
      totalControls: 0,
      mappedControls: 0,
      unmappedControls: 0,
      coveragePercent: 0,
    } as never);

    render(<MappingCoverageWidget />);

    expect(await screen.findByText('No data yet')).toBeInTheDocument();
    // Percentage headline should NOT be rendered
    expect(screen.queryByText('0%')).not.toBeInTheDocument();
  });

  it('renders loading state', () => {
    // Pending promise — never resolves during the test
    vi.mocked(frameworksApi.mappings.getControlCoverage).mockImplementation(
      () => new Promise(() => undefined)
    );

    render(<MappingCoverageWidget />);

    const status = screen.getByRole('status', { name: /loading mapping coverage/i });
    expect(status).toBeInTheDocument();
  });

  it('renders error state on API failure', async () => {
    vi.mocked(frameworksApi.mappings.getControlCoverage).mockRejectedValue(new Error('boom'));

    render(<MappingCoverageWidget />);

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(/failed to load/i);
    });
  });

  it('exposes a11y labels (region + percent)', async () => {
    vi.mocked(frameworksApi.mappings.getControlCoverage).mockResolvedValue({
      totalControls: 10,
      mappedControls: 5,
      unmappedControls: 5,
      coveragePercent: 50,
    } as never);

    render(<MappingCoverageWidget />);

    await screen.findByText('50%');

    const region = screen.getByRole('region', { name: /organization mapping coverage/i });
    expect(region).toBeInTheDocument();

    expect(screen.getByLabelText('50 percent')).toBeInTheDocument();
  });

  it('uses per-framework region label when frameworkId provided', async () => {
    vi.mocked(frameworksApi.mappings.getRequirementCoverage).mockResolvedValue({
      totalRequirements: 4,
      mappedRequirements: 2,
      unmappedRequirements: 2,
      coveragePercent: 50,
    } as never);

    render(<MappingCoverageWidget frameworkId="fw-2" />);

    await screen.findByText('50%');

    expect(screen.getByRole('region', { name: /framework mapping coverage/i })).toBeInTheDocument();
  });
});
