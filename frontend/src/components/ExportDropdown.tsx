import { useState, useRef, useEffect } from 'react';
import { ArrowDownTrayIcon, ChevronDownIcon } from '@heroicons/react/24/outline';
import { Button } from '@/components/ui/Button';
import { exportData, ExportFormat } from '@/lib/export';
import toast from 'react-hot-toast';
import clsx from 'clsx';

interface ExportColumn<T> {
  key: keyof T | string;
  header: string;
  transform?: (value: unknown, row: T) => string | number;
}

interface ExportDropdownProps<T> {
  data: T[];
  columns: ExportColumn<T>[];
  filename: string;
  sheetName?: string;
  disabled?: boolean;
  buttonText?: string;
  variant?: 'primary' | 'secondary' | 'outline';
  size?: 'sm' | 'md' | 'lg';
}

const formatOptions: { value: ExportFormat; label: string; icon: string }[] = [
  { value: 'csv', label: 'Export as CSV', icon: '📄' },
  { value: 'xlsx', label: 'Export as Excel', icon: '📊' },
  { value: 'json', label: 'Export as JSON', icon: '{ }' },
];

export function ExportDropdown<T>({
  data,
  columns,
  filename,
  sheetName,
  disabled = false,
  buttonText = 'Export',
  variant = 'secondary',
  size = 'md',
}: ExportDropdownProps<T>) {
  const [isOpen, setIsOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Close dropdown on Escape
  useEffect(() => {
    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [isOpen]);

  const handleExport = async (format: ExportFormat) => {
    if (data.length === 0) {
      toast.error('No data to export');
      return;
    }

    setIsExporting(true);
    setIsOpen(false);

    try {
      // Small delay for UX feedback
      await new Promise((resolve) => setTimeout(resolve, 300));

      await exportData({
        filename,
        columns,
        data,
        format,
        sheetName,
      });

      toast.success(`Exported ${data.length} records as ${format.toUpperCase()}`);
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Failed to export data');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="relative inline-block" ref={dropdownRef}>
      <Button
        variant={variant}
        size={size}
        onClick={() => setIsOpen(!isOpen)}
        disabled={disabled || isExporting}
        isLoading={isExporting}
        loadingText="Exporting..."
        leftIcon={<ArrowDownTrayIcon className="w-4 h-4" />}
        rightIcon={
          <ChevronDownIcon
            className={clsx('w-4 h-4 transition-transform', isOpen && 'rotate-180')}
          />
        }
      >
        {buttonText}
      </Button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-48 bg-surface-800 border border-surface-700 rounded-lg shadow-xl z-50 overflow-hidden">
          {formatOptions.map((option) => (
            <button
              key={option.value}
              onClick={() => handleExport(option.value)}
              className="w-full px-4 py-2.5 text-left text-sm text-surface-200 hover:bg-surface-700 flex items-center gap-3 transition-colors"
            >
              <span className="text-base">{option.icon}</span>
              {option.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// Simple export button (single format)
interface ExportButtonProps<T> {
  data: T[];
  columns: ExportColumn<T>[];
  filename: string;
  format?: ExportFormat;
  sheetName?: string;
  disabled?: boolean;
  buttonText?: string;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
}

export function ExportButton<T>({
  data,
  columns,
  filename,
  format = 'csv',
  sheetName,
  disabled = false,
  buttonText = 'Export CSV',
  variant = 'secondary',
  size = 'md',
}: ExportButtonProps<T>) {
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async () => {
    if (data.length === 0) {
      toast.error('No data to export');
      return;
    }

    setIsExporting(true);

    try {
      await new Promise((resolve) => setTimeout(resolve, 300));

      await exportData({
        filename,
        columns,
        data,
        format,
        sheetName,
      });

      toast.success(`Exported ${data.length} records`);
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Failed to export data');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Button
      variant={variant}
      size={size}
      onClick={handleExport}
      disabled={disabled}
      isLoading={isExporting}
      loadingText="Exporting..."
      leftIcon={<ArrowDownTrayIcon className="w-4 h-4" />}
    >
      {buttonText}
    </Button>
  );
}

export default ExportDropdown;
