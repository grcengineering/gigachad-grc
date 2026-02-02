import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { StatusBadge, getStatusConfig, getStatusColor, STATUS_CONFIGS } from './StatusBadge';

describe('StatusBadge', () => {
  describe('rendering', () => {
    it('should render with predefined status', () => {
      render(<StatusBadge status="implemented" />);
      expect(screen.getByText('Implemented')).toBeInTheDocument();
    });

    it('should render with custom status config', () => {
      render(
        <StatusBadge
          status="custom"
          config={{ label: 'Custom Label', color: 'purple' }}
        />
      );
      expect(screen.getByText('Custom Label')).toBeInTheDocument();
    });

    it('should fall back to status string when not in configs', () => {
      render(<StatusBadge status="unknown_status" />);
      expect(screen.getByText('unknown_status')).toBeInTheDocument();
    });

    it('should normalize status with spaces to underscores', () => {
      render(<StatusBadge status="in progress" />);
      expect(screen.getByText('In Progress')).toBeInTheDocument();
    });

    it('should be case insensitive', () => {
      render(<StatusBadge status="IMPLEMENTED" />);
      expect(screen.getByText('Implemented')).toBeInTheDocument();
    });
  });

  describe('sizes', () => {
    it('should render small size', () => {
      const { container } = render(<StatusBadge status="active" size="sm" />);
      const badge = container.firstChild;
      expect(badge).toHaveClass('text-xs');
    });

    it('should render medium size by default', () => {
      const { container } = render(<StatusBadge status="active" />);
      const badge = container.firstChild;
      expect(badge).toHaveClass('text-sm');
    });

    it('should render large size', () => {
      const { container } = render(<StatusBadge status="active" size="lg" />);
      const badge = container.firstChild;
      expect(badge).toHaveClass('text-sm');
      expect(badge).toHaveClass('px-3');
    });
  });

  describe('dot indicator', () => {
    it('should show dot when showDot is true', () => {
      const { container } = render(<StatusBadge status="active" showDot />);
      const dot = container.querySelector('.rounded-full.w-2.h-2');
      expect(dot).toBeInTheDocument();
    });

    it('should not show dot by default', () => {
      const { container } = render(<StatusBadge status="active" />);
      const dots = container.querySelectorAll('.rounded-full.w-2.h-2');
      expect(dots.length).toBe(0);
    });
  });

  describe('colors', () => {
    it('should apply green color for implemented status', () => {
      const { container } = render(<StatusBadge status="implemented" />);
      const badge = container.firstChild;
      expect(badge).toHaveClass('bg-green-100');
      expect(badge).toHaveClass('text-green-800');
    });

    it('should apply red color for critical status', () => {
      const { container } = render(<StatusBadge status="critical" />);
      const badge = container.firstChild;
      expect(badge).toHaveClass('bg-red-100');
      expect(badge).toHaveClass('text-red-800');
    });

    it('should apply yellow color for in_progress status', () => {
      const { container } = render(<StatusBadge status="in_progress" />);
      const badge = container.firstChild;
      expect(badge).toHaveClass('bg-yellow-100');
      expect(badge).toHaveClass('text-yellow-800');
    });
  });

  describe('custom className', () => {
    it('should apply additional className', () => {
      const { container } = render(
        <StatusBadge status="active" className="custom-class" />
      );
      const badge = container.firstChild;
      expect(badge).toHaveClass('custom-class');
    });
  });
});

describe('getStatusConfig', () => {
  it('should return config for known status', () => {
    const config = getStatusConfig('implemented');
    expect(config).toEqual({ label: 'Implemented', color: 'green' });
  });

  it('should return default config for unknown status', () => {
    const config = getStatusConfig('unknown');
    expect(config).toEqual({ label: 'unknown', color: 'gray' });
  });

  it('should handle status with spaces', () => {
    const config = getStatusConfig('in progress');
    expect(config.label).toBe('In Progress');
    expect(config.color).toBe('yellow');
  });
});

describe('getStatusColor', () => {
  it('should return correct color for status', () => {
    expect(getStatusColor('implemented')).toBe('green');
    expect(getStatusColor('critical')).toBe('red');
    expect(getStatusColor('in_progress')).toBe('yellow');
    expect(getStatusColor('unknown')).toBe('gray');
  });
});

describe('STATUS_CONFIGS', () => {
  it('should have all expected control statuses', () => {
    expect(STATUS_CONFIGS.implemented).toBeDefined();
    expect(STATUS_CONFIGS.in_progress).toBeDefined();
    expect(STATUS_CONFIGS.not_started).toBeDefined();
  });

  it('should have all expected risk statuses', () => {
    expect(STATUS_CONFIGS.open).toBeDefined();
    expect(STATUS_CONFIGS.mitigated).toBeDefined();
    expect(STATUS_CONFIGS.accepted).toBeDefined();
  });

  it('should have all expected priority levels', () => {
    expect(STATUS_CONFIGS.critical).toBeDefined();
    expect(STATUS_CONFIGS.high).toBeDefined();
    expect(STATUS_CONFIGS.medium).toBeDefined();
    expect(STATUS_CONFIGS.low).toBeDefined();
  });
});
