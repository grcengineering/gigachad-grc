import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  MagnifyingGlassIcon,
  FunnelIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  UserIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  XCircleIcon,
  BuildingOffice2Icon,
  ComputerDesktopIcon,
  AcademicCapIcon,
  ShieldCheckIcon,
  KeyIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/outline';
import { employeeComplianceApi } from '../lib/api';

import { Input } from '@/components/ui/Input';

import { SelectNative } from '@/components/ui/SelectNative';

import { Button } from '@/components/ui/Button';

interface Employee {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  fullName: string;
  department?: string;
  jobTitle?: string;
  employmentStatus?: string;
  complianceScore?: number;
  backgroundCheckStatus?: string;
  overdueTrainings: number;
  pendingAttestations: number;
  dataSources: {
    hasHris: boolean;
    hasBackgroundCheck: boolean;
    hasTraining: boolean;
    hasAssets: boolean;
    hasAccess: boolean;
  };
  lastCorrelatedAt: string;
}

function getScoreColor(score: number | undefined): string {
  if (score === undefined) return 'text-gray-400';
  if (score >= 80) return 'text-green-500';
  if (score >= 60) return 'text-yellow-500';
  return 'text-red-500';
}

function getScoreBgColor(score: number | undefined): string {
  if (score === undefined) return 'bg-gray-500/20';
  if (score >= 80) return 'bg-green-500/20';
  if (score >= 60) return 'bg-yellow-500/20';
  return 'bg-red-500/20';
}

function getStatusBadge(status: string | undefined) {
  switch (status) {
    case 'clear':
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-green-500/20 text-green-600">
          <CheckCircleIcon className="h-3 w-3" />
          Clear
        </span>
      );
    case 'pending':
    case 'in_progress':
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-yellow-500/20 text-yellow-600">
          <ArrowPathIcon className="h-3 w-3" />
          Pending
        </span>
      );
    case 'flagged':
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-red-500/20 text-red-600">
          <XCircleIcon className="h-3 w-3" />
          Flagged
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-gray-500/20 text-gray-400">
          <ExclamationTriangleIcon className="h-3 w-3" />
          None
        </span>
      );
  }
}

function DataSourceIcons({ dataSources }: { dataSources: Employee['dataSources'] }) {
  // Handle case where dataSources might be undefined or have missing properties
  const sources = dataSources || {
    hasHris: false,
    hasBackgroundCheck: false,
    hasTraining: false,
    hasAssets: false,
    hasAccess: false,
  };
  return (
    <div className="flex items-center gap-1">
      <div
        className={`p-1 rounded ${sources.hasHris ? 'text-blue-600' : 'text-gray-600'}`}
        title="HRIS"
      >
        <BuildingOffice2Icon className="h-4 w-4" />
      </div>
      <div
        className={`p-1 rounded ${sources.hasBackgroundCheck ? 'text-green-600' : 'text-gray-600'}`}
        title="Background Check"
      >
        <ShieldCheckIcon className="h-4 w-4" />
      </div>
      <div
        className={`p-1 rounded ${sources.hasTraining ? 'text-purple-600' : 'text-gray-600'}`}
        title="Training"
      >
        <AcademicCapIcon className="h-4 w-4" />
      </div>
      <div
        className={`p-1 rounded ${sources.hasAssets ? 'text-orange-600' : 'text-gray-600'}`}
        title="Assets"
      >
        <ComputerDesktopIcon className="h-4 w-4" />
      </div>
      <div
        className={`p-1 rounded ${sources.hasAccess ? 'text-cyan-600' : 'text-gray-600'}`}
        title="Access"
      >
        <KeyIcon className="h-4 w-4" />
      </div>
    </div>
  );
}

export default function Employees() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [departments, setDepartments] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('');
  const [complianceFilter, setComplianceFilter] = useState('');
  const [sortBy, setSortBy] = useState('lastName');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [showFilters, setShowFilters] = useState(false);

  const fetchEmployees = useCallback(async () => {
    setLoading(true);
    try {
      const response = await employeeComplianceApi.list({
        search: search || undefined,
        department: departmentFilter || undefined,
        complianceStatus: complianceFilter || undefined,
        sortBy,
        sortOrder,
        page,
        limit: 25,
      });

      const data = response.data;

      // Transform API response to match our Employee interface
      const transformedEmployees: Employee[] = (data.data || data || []).map((emp: any) => ({
        id: emp.id,
        email: emp.email,
        firstName: emp.firstName,
        lastName: emp.lastName,
        fullName:
          emp.fullName || `${emp.firstName || ''} ${emp.lastName || ''}`.trim() || emp.email,
        department: emp.department,
        jobTitle: emp.jobTitle,
        employmentStatus: emp.employmentStatus,
        complianceScore: emp.complianceScore,
        backgroundCheckStatus: emp.backgroundCheckStatus || emp.latestBackgroundCheck?.status,
        overdueTrainings: emp.overdueTrainings ?? emp.overdueTrainingCount ?? 0,
        pendingAttestations: emp.pendingAttestations ?? emp.pendingAttestationCount ?? 0,
        dataSources: emp.dataSources || {
          hasHris: !!emp.hrisSource,
          hasBackgroundCheck: !!emp.latestBackgroundCheck,
          hasTraining: (emp.trainingRecordCount ?? 0) > 0,
          hasAssets: (emp.assetCount ?? 0) > 0,
          hasAccess: (emp.accessRecordCount ?? 0) > 0,
        },
        lastCorrelatedAt: emp.lastCorrelatedAt || emp.updatedAt,
      }));

      setEmployees(transformedEmployees);
      setTotal(data.total || transformedEmployees.length);
      setTotalPages(Math.ceil((data.total || transformedEmployees.length) / 25));
    } catch (error) {
      console.error('Failed to fetch employees:', error);
      setEmployees([]);
      setTotal(0);
      setTotalPages(1);
    } finally {
      setLoading(false);
    }
  }, [search, departmentFilter, complianceFilter, sortBy, sortOrder, page]);

  const fetchDepartments = useCallback(async () => {
    try {
      const response = await employeeComplianceApi.getDepartments();
      setDepartments(response.data || []);
    } catch (error) {
      console.error('Failed to fetch departments:', error);
    }
  }, []);

  useEffect(() => {
    fetchDepartments();
  }, [fetchDepartments]);

  useEffect(() => {
    fetchEmployees();
  }, [fetchEmployees]);

  const handleSort = (field: string) => {
    if (sortBy === field) setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    else {
      setSortBy(field);
      setSortOrder('asc');
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Employee Compliance</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Track employee compliance with training, background checks, and attestations
          </p>
        </div>
        <Link to="/people/dashboard" className="btn btn-primary">
          View Dashboard
        </Link>
      </div>
      <div className="card p-4 space-y-4">
        <div className="flex items-center gap-4">
          <div className="flex-1 relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search by name, email, or department..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input pl-10 w-full"
            />
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`btn btn-secondary ${showFilters ? 'bg-primary/20' : ''}`}
          >
            <FunnelIcon className="h-5 w-5" />
            Filters
          </button>
        </div>
        {showFilters && (
          <div className="flex flex-wrap gap-4 pt-4 border-t border-border">
            <div className="flex items-center gap-2">
              <label className="text-sm text-muted-foreground">Department:</label>
              <SelectNative
                value={departmentFilter}
                onChange={(e) => setDepartmentFilter(e.target.value)}
                className="input"
              >
                <option value="">All Departments</option>
                {departments.map((dept) => (
                  <option key={dept} value={dept}>
                    {dept}
                  </option>
                ))}
              </SelectNative>
            </div>
            <div className="flex items-center gap-2">
              <label className="text-sm text-muted-foreground">Compliance:</label>
              <SelectNative
                value={complianceFilter}
                onChange={(e) => setComplianceFilter(e.target.value)}
                className="input"
              >
                <option value="">All Status</option>
                <option value="compliant">Compliant (80+)</option>
                <option value="at_risk">At Risk (60-79)</option>
                <option value="non_compliant">Non-Compliant (&lt;60)</option>
              </SelectNative>
            </div>
            <button
              onClick={() => {
                setDepartmentFilter('');
                setComplianceFilter('');
              }}
              className="text-sm text-primary hover:text-primary/80"
            >
              Clear Filters
            </button>
          </div>
        )}
      </div>
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>{total} employees found</span>
        <div className="flex items-center gap-2">
          <span>Sort by:</span>
          <button
            onClick={() => handleSort('lastName')}
            className={`px-2 py-1 rounded ${sortBy === 'lastName' ? 'bg-surface-700 text-foreground' : ''}`}
          >
            Name {sortBy === 'lastName' && (sortOrder === 'asc' ? '↑' : '↓')}
          </button>
          <button
            onClick={() => handleSort('complianceScore')}
            className={`px-2 py-1 rounded ${sortBy === 'complianceScore' ? 'bg-surface-700 text-foreground' : ''}`}
          >
            Score {sortBy === 'complianceScore' && (sortOrder === 'asc' ? '↑' : '↓')}
          </button>
          <button
            onClick={() => handleSort('department')}
            className={`px-2 py-1 rounded ${sortBy === 'department' ? 'bg-surface-700 text-foreground' : ''}`}
          >
            Dept {sortBy === 'department' && (sortOrder === 'asc' ? '↑' : '↓')}
          </button>
        </div>
      </div>
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-surface-800/50">
                <th className="text-left p-4 font-medium text-muted-foreground">Employee</th>
                <th className="text-left p-4 font-medium text-muted-foreground">Department</th>
                <th className="text-center p-4 font-medium text-muted-foreground">Score</th>
                <th className="text-center p-4 font-medium text-muted-foreground">Background</th>
                <th className="text-center p-4 font-medium text-muted-foreground">Issues</th>
                <th className="text-center p-4 font-medium text-muted-foreground">Data Sources</th>
                <th className="text-right p-4 font-medium text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-muted-foreground">
                    <ArrowPathIcon className="h-6 w-6 animate-spin mx-auto mb-2" />
                    Loading employees...
                  </td>
                </tr>
              ) : employees.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-muted-foreground">
                    No employees found.{' '}
                    {total === 0 &&
                      'Load demo data to see sample employees or configure HR integrations to import employee data.'}
                  </td>
                </tr>
              ) : (
                employees.map((employee) => (
                  <tr key={employee.id} className="border-b border-border hover:bg-surface-800/30">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-surface-700 flex items-center justify-center">
                          <UserIcon className="h-5 w-5 text-muted-foreground" />
                        </div>
                        <div>
                          <Link
                            to={`/people/${employee.id}`}
                            className="font-medium text-foreground hover:text-primary"
                          >
                            {employee.fullName}
                          </Link>
                          <p className="text-sm text-muted-foreground">{employee.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      <span className="text-foreground">{employee.department || '—'}</span>
                      {employee.jobTitle && (
                        <p className="text-sm text-muted-foreground">{employee.jobTitle}</p>
                      )}
                    </td>
                    <td className="p-4 text-center">
                      <span
                        className={`inline-flex items-center justify-center w-12 h-12 rounded-full text-lg font-bold ${getScoreBgColor(employee.complianceScore)} ${getScoreColor(employee.complianceScore)}`}
                      >
                        {employee.complianceScore ?? '—'}
                      </span>
                    </td>
                    <td className="p-4 text-center">
                      {getStatusBadge(employee.backgroundCheckStatus)}
                    </td>
                    <td className="p-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        {employee.overdueTrainings > 0 && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-red-500/20 text-red-600">
                            <AcademicCapIcon className="h-3 w-3" />
                            {employee.overdueTrainings}
                          </span>
                        )}
                        {employee.pendingAttestations > 0 && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-yellow-500/20 text-yellow-600">
                            <ExclamationTriangleIcon className="h-3 w-3" />
                            {employee.pendingAttestations}
                          </span>
                        )}
                        {employee.overdueTrainings === 0 && employee.pendingAttestations === 0 && (
                          <span className="text-sm text-green-600">None</span>
                        )}
                      </div>
                    </td>
                    <td className="p-4">
                      <DataSourceIcons dataSources={employee.dataSources} />
                    </td>
                    <td className="p-4 text-right">
                      <Link
                        to={`/people/${employee.id}`}
                        className="text-sm text-primary hover:text-primary/80"
                      >
                        View Details →
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {totalPages > 1 && (
          <div className="flex items-center justify-between p-4 border-t border-border">
            <span className="text-sm text-muted-foreground">
              Showing {(page - 1) * 25 + 1} to {Math.min(page * 25, total)} of {total}
            </span>
            <div className="flex items-center gap-2">
              <Button
                onClick={() => setPage(page - 1)}
                disabled={page === 1}
                className="disabled:opacity-50"
                variant="secondary"
              >
                <ChevronLeftIcon className="h-4 w-4" />
              </Button>
              <span className="text-sm">
                Page {page} of {totalPages}
              </span>
              <Button
                onClick={() => setPage(page + 1)}
                disabled={page === totalPages}
                className="disabled:opacity-50"
                variant="secondary"
              >
                <ChevronRightIcon className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
