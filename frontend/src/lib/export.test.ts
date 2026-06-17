import { describe, it, expect, vi, beforeEach } from 'vitest';
import { exportData, exportConfigs } from './export';

// Mock exceljs with dynamic import support
const mockWorksheet = {
  addRow: vi.fn(() => ({ eachCell: vi.fn() })),
  columns: [],
};
const mockWorkbook = {
  addWorksheet: vi.fn(() => mockWorksheet),
  xlsx: {
    writeBuffer: vi.fn(() => Promise.resolve(new ArrayBuffer(8))),
  },
};

// `new ExcelJS.Workbook()` is constructed with `new`, so the mock must be a
// constructor. A regular function returning the mock works (arrow functions
// are not constructors and throw under vitest 4).
vi.mock('exceljs', () => ({
  default: {
    Workbook: vi.fn(function () {
      return mockWorkbook;
    }),
  },
  Workbook: vi.fn(function () {
    return mockWorkbook;
  }),
}));

describe('Export Utilities', () => {
  const mockData = [
    { id: '1', name: 'Item 1', value: 100, status: 'active' },
    { id: '2', name: 'Item 2', value: 200, status: 'inactive' },
    { id: '3', name: 'Item 3', value: 300, status: 'active' },
  ];

  const mockColumns = [
    { key: 'name', header: 'Name' },
    { key: 'value', header: 'Value' },
    { key: 'status', header: 'Status' },
  ];

  beforeEach(() => {
    vi.clearAllMocks();

    // Mock URL APIs
    global.URL.createObjectURL = vi.fn(() => 'blob:mock-url');
    global.URL.revokeObjectURL = vi.fn();

    // Mock document.createElement
    const mockClick = vi.fn();
    const mockLink = { href: '', download: '', click: mockClick };
    vi.spyOn(document, 'createElement').mockReturnValue(mockLink as unknown as HTMLElement);
    vi.spyOn(document.body, 'appendChild').mockImplementation(
      () => mockLink as unknown as HTMLElement
    );
    vi.spyOn(document.body, 'removeChild').mockImplementation(
      () => mockLink as unknown as HTMLElement
    );
  });

  describe('exportData', () => {
    it('exports to CSV format', async () => {
      await exportData({
        filename: 'test-export',
        columns: mockColumns,
        data: mockData,
        format: 'csv',
      });

      expect(global.URL.createObjectURL).toHaveBeenCalled();
      const link = document.createElement('a') as unknown as { download: string };
      expect(link.download).toContain('test-export');
      expect(link.download).toContain('.csv');
    });

    it('exports to JSON format', async () => {
      await exportData({
        filename: 'test-export',
        columns: mockColumns,
        data: mockData,
        format: 'json',
      });

      expect(global.URL.createObjectURL).toHaveBeenCalled();
      const link = document.createElement('a') as unknown as { download: string };
      expect(link.download).toContain('test-export');
      expect(link.download).toContain('.json');
    });

    it('exports to XLSX format', async () => {
      await exportData({
        filename: 'test-export',
        columns: mockColumns,
        data: mockData,
        format: 'xlsx',
      });

      expect(mockWorkbook.addWorksheet).toHaveBeenCalled();
      expect(mockWorkbook.xlsx.writeBuffer).toHaveBeenCalled();
      expect(global.URL.createObjectURL).toHaveBeenCalled();
    });

    it('handles nested object properties with dot notation', async () => {
      const nestedData = [{ id: '1', details: { name: 'Nested Item', count: 5 } }];
      const nestedColumns = [
        { key: 'details.name', header: 'Detail Name' },
        { key: 'details.count', header: 'Count' },
      ];

      // This should not throw
      await expect(
        exportData({
          filename: 'nested-export',
          columns: nestedColumns,
          data: nestedData,
          format: 'csv',
        })
      ).resolves.not.toThrow();
    });

    it('handles custom transform functions', async () => {
      const columnsWithTransform = [
        {
          key: 'status',
          header: 'Status',
          transform: (v: unknown) => String(v).toUpperCase(),
        },
      ];

      await expect(
        exportData({
          filename: 'transform-export',
          columns: columnsWithTransform,
          data: mockData,
          format: 'csv',
        })
      ).resolves.not.toThrow();
    });

    it('handles empty data array', async () => {
      await expect(
        exportData({
          filename: 'empty-export',
          columns: mockColumns,
          data: [],
          format: 'csv',
        })
      ).resolves.not.toThrow();
    });

    it('adds timestamp to filename', async () => {
      await exportData({
        filename: 'test-export',
        columns: mockColumns,
        data: mockData,
        format: 'csv',
      });

      const link = document.createElement('a') as unknown as { download: string };
      // Should contain date in YYYY-MM-DD format
      expect(link.download).toMatch(/test-export_\d{4}-\d{2}-\d{2}\.csv/);
    });
  });

  describe('exportConfigs', () => {
    it('has controls configuration', () => {
      expect(exportConfigs.controls).toBeDefined();
      expect(Array.isArray(exportConfigs.controls)).toBe(true);
      expect(exportConfigs.controls.length).toBeGreaterThan(0);
    });

    it('has risks configuration', () => {
      expect(exportConfigs.risks).toBeDefined();
      expect(Array.isArray(exportConfigs.risks)).toBe(true);
      expect(exportConfigs.risks.length).toBeGreaterThan(0);
    });

    it('has vendors configuration', () => {
      expect(exportConfigs.vendors).toBeDefined();
      expect(Array.isArray(exportConfigs.vendors)).toBe(true);
      expect(exportConfigs.vendors.length).toBeGreaterThan(0);
    });

    it('has policies configuration', () => {
      expect(exportConfigs.policies).toBeDefined();
      expect(Array.isArray(exportConfigs.policies)).toBe(true);
      expect(exportConfigs.policies.length).toBeGreaterThan(0);
    });

    it('has assets configuration', () => {
      expect(exportConfigs.assets).toBeDefined();
      expect(Array.isArray(exportConfigs.assets)).toBe(true);
      expect(exportConfigs.assets.length).toBeGreaterThan(0);
    });

    it('has audits configuration', () => {
      expect(exportConfigs.audits).toBeDefined();
      expect(Array.isArray(exportConfigs.audits)).toBe(true);
      expect(exportConfigs.audits.length).toBeGreaterThan(0);
    });

    it('control config has required columns', () => {
      const requiredKeys = ['controlId', 'title', 'description', 'status', 'category'];
      const actualKeys = exportConfigs.controls.map((c) => c.key);

      requiredKeys.forEach((key) => {
        expect(actualKeys).toContain(key);
      });
    });
  });
});
