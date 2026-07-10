/**
 * People / Training dev stubs.
 */

import { type StubHandler } from './_helpers';

export const peopleHandlers: StubHandler[] = [
  { method: 'GET', path: '/', body: () => ({
    data: [],
    total: 0,
    totalPages: 0,
    departments: [],
    stats: { total: 0, active: 0, inactive: 0, compliancePct: 0, overdue: 0 },
  })},
  { method: 'GET', path: '/:id', body: ({ id }) => ({ __status: 404, body: { message: `Employee ${id} not found` } }) },
];

export const trainingHandlers: StubHandler[] = [
  { method: 'GET', path: '/my', body: () => ({
    summary: { assigned: 0, inProgress: 0, completed: 0, overdue: 0, completionPct: 0 },
    courses: [],
    certificates: [],
  })},
  { method: 'GET', path: '/admin/campaigns', body: () => ({
    campaigns: [],
    summary: { activeCampaigns: 0, totalAssignments: 0, completionPct: 0, overdueCount: 0 },
  })},
];

export const employeeComplianceHandlers: StubHandler[] = [
  { method: 'GET', path: '/dashboard', body: () => ({
    summary: { compliancePct: 0, totalEmployees: 0, overdue: 0, expiringSoon: 0 },
    byDepartment: [],
    assignmentFunnel: { assigned: 0, inProgress: 0, completed: 0 },
    overdueEmployees: [],
  })},
];
