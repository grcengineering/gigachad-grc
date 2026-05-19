import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  PlusIcon,
  MagnifyingGlassIcon,
  MegaphoneIcon,
  UserGroupIcon,
  PhoneIcon,
  EnvelopeIcon,
  ArrowPathIcon,
  ExclamationCircleIcon,
} from '@heroicons/react/24/outline';
import api from '@/lib/api';
import { useDebounce } from '@/hooks/useDebounce';
import clsx from 'clsx';

import { Input } from '@/components/ui/Input';

import { SelectNative } from '@/components/ui/SelectNative';

interface CommunicationPlan {
  id: string;
  name: string;
  description: string;
  plan_type: string;
  is_active: boolean;
  bcdr_plan_title: string;
  contact_count: number;
}

interface EscalationContact {
  id: string;
  name: string;
  title: string;
  organization_name: string;
  contact_type: string;
  primary_phone: string;
  email: string;
  role_in_plan: string;
  escalation_level: number;
  plan_name: string;
}

const planTypeLabels: Record<string, string> = {
  emergency: 'Emergency',
  crisis: 'Crisis',
  incident: 'Incident',
  stakeholder: 'Stakeholder',
};

const contactTypeColors: Record<string, string> = {
  internal: 'bg-blue-500/20 text-blue-600',
  vendor: 'bg-purple-500/20 text-purple-600',
  customer: 'bg-green-500/20 text-green-600',
  regulatory: 'bg-orange-500/20 text-orange-600',
  emergency_services: 'bg-red-500/20 text-red-600',
  media: 'bg-yellow-500/20 text-yellow-600',
  other: 'bg-surface-600 text-surface-700',
};

export default function CommunicationPlans() {
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('');
  const [showEscalation, setShowEscalation] = useState(false);
  const debouncedSearch = useDebounce(search, 300);

  const {
    data: plansData,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['communication-plans', debouncedSearch, typeFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (debouncedSearch) params.append('search', debouncedSearch);
      if (typeFilter) params.append('planType', typeFilter);

      const res = await api.get(`/api/bcdr/communication?${params}`);
      return res.data;
    },
    retry: 1,
  });

  // Handle both { data: [...] } and direct array response
  const plans = Array.isArray(plansData) ? plansData : (plansData?.data ?? []);

  const { data: escalationData, error: escalationError } = useQuery({
    queryKey: ['escalation-contacts'],
    queryFn: async () => {
      const res = await api.get('/api/bcdr/communication/escalation');
      return res.data;
    },
    enabled: showEscalation,
    retry: 1,
  });

  // Error state
  if (error && !showEscalation) {
    return (
      <div className="p-6">
        <div className="card p-8 text-center">
          <ExclamationCircleIcon className="w-12 h-12 mx-auto mb-4 text-red-600" />
          <h2 className="text-lg font-semibold text-surface-100 mb-2">
            Failed to load Communication Plans
          </h2>
          <p className="text-surface-600 mb-4">
            {(error as Error).message || 'An unexpected error occurred'}
          </p>
          <button onClick={() => refetch()} className="btn btn-primary">
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-surface-100">Communication Plans</h1>
          <p className="text-surface-600 mt-1">
            Emergency contact lists and communication protocols
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => setShowEscalation(!showEscalation)}
            className={clsx('btn btn-secondary', showEscalation && 'bg-brand-600 border-brand-600')}
          >
            <UserGroupIcon className="w-5 h-5 mr-2" />
            Escalation View
          </button>
          <Link to="/bcdr/communication/new" className="btn btn-primary">
            <PlusIcon className="w-5 h-5 mr-2" />
            Create Plan
          </Link>
        </div>
      </div>
      {/* Filters */}
      {!showEscalation && (
        <div className="card p-4">
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-64">
              <div className="relative">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-surface-600" />
                <Input
                  type="text"
                  placeholder="Search plans..."
                  className="form-input pl-10 w-full"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </div>
            <div className="w-40">
              <SelectNative
                className="form-select w-full"
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
              >
                <option value="">All Types</option>
                {Object.entries(planTypeLabels).map(([key, label]) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ))}
              </SelectNative>
            </div>
            <button onClick={() => refetch()} className="btn btn-secondary">
              <ArrowPathIcon className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}
      {showEscalation ? (
        /* Escalation View */
        <div className="space-y-6">
          {escalationError && (
            <div className="card p-4 border border-red-500/50 bg-red-500/10 text-sm text-red-700">
              Failed to load escalation contacts. {(escalationError as Error).message || ''}
            </div>
          )}
          {escalationData &&
            Object.entries(escalationData)
              .sort(([a], [b]) => Number(a) - Number(b))
              .map(([level, contacts]) => (
                <div key={level} className="card p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div
                      className={clsx(
                        'w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg',
                        Number(level) === 1
                          ? 'bg-red-500/20 text-red-600'
                          : Number(level) === 2
                            ? 'bg-orange-500/20 text-orange-600'
                            : 'bg-yellow-500/20 text-yellow-600'
                      )}
                    >
                      L{level}
                    </div>
                    <div>
                      <h2 className="text-lg font-semibold text-surface-100">
                        Level {level} Contacts
                      </h2>
                      <p className="text-surface-600 text-sm">
                        {Number(level) === 1
                          ? 'First responders'
                          : Number(level) === 2
                            ? 'Secondary escalation'
                            : 'Management escalation'}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {(contacts as EscalationContact[]).map((contact) => (
                      <div
                        key={contact.id}
                        className="p-4 rounded-lg bg-surface-800/50 border border-surface-700"
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <h3 className="text-surface-100 font-medium">{contact.name}</h3>
                            {contact.title && (
                              <p className="text-surface-600 text-sm">{contact.title}</p>
                            )}
                          </div>
                          <span
                            className={clsx(
                              'px-2 py-0.5 rounded text-xs font-medium',
                              contactTypeColors[contact.contact_type]
                            )}
                          >
                            {contact.contact_type}
                          </span>
                        </div>

                        {contact.organization_name && (
                          <p className="text-surface-600 text-xs mb-2">
                            {contact.organization_name}
                          </p>
                        )}

                        <div className="space-y-1 text-sm">
                          {contact.primary_phone && (
                            <div className="flex items-center gap-2 text-surface-700">
                              <PhoneIcon className="w-4 h-4 text-surface-600" />
                              {contact.primary_phone}
                            </div>
                          )}
                          {contact.email && (
                            <div className="flex items-center gap-2 text-surface-700">
                              <EnvelopeIcon className="w-4 h-4 text-surface-600" />
                              {contact.email}
                            </div>
                          )}
                        </div>

                        {contact.role_in_plan && (
                          <p className="text-surface-500 text-xs mt-2 pt-2 border-t border-surface-700">
                            Role: {contact.role_in_plan}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
          {(!escalationData || Object.keys(escalationData).length === 0) && (
            <div className="card p-8 text-center text-surface-600">
              <UserGroupIcon className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No escalation contacts configured</p>
              <Link
                to="/bcdr/communication/new"
                className="text-brand-400 hover:text-brand-300 mt-2 inline-block"
              >
                Create a communication plan →
              </Link>
            </div>
          )}
        </div>
      ) : (
        /* Plans Grid */
        <>
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3].map((i) => (
                <div key={i} className="card p-6 animate-pulse">
                  <div className="h-6 bg-surface-700 rounded w-3/4 mb-4"></div>
                  <div className="h-4 bg-surface-700 rounded w-1/2 mb-2"></div>
                  <div className="h-4 bg-surface-700 rounded w-2/3"></div>
                </div>
              ))}
            </div>
          ) : !plans || plans.length === 0 ? (
            <div className="card p-8 text-center text-surface-600">
              <MegaphoneIcon className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No communication plans found</p>
              <Link
                to="/bcdr/communication/new"
                className="text-brand-400 hover:text-brand-300 mt-2 inline-block"
              >
                Create your first plan →
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {plans.map((plan: CommunicationPlan) => (
                <Link
                  key={plan.id}
                  to={`/bcdr/communication/${plan.id}`}
                  className="card p-6 hover:border-brand-500/50 transition-colors"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <MegaphoneIcon className="w-5 h-5 text-brand-400" />
                      <span
                        className={clsx(
                          'px-2 py-0.5 rounded text-xs font-medium',
                          plan.is_active
                            ? 'bg-green-500/20 text-green-600'
                            : 'bg-surface-600 text-surface-600'
                        )}
                      >
                        {plan.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                    <span className="px-2 py-0.5 rounded bg-surface-700 text-surface-700 text-xs">
                      {planTypeLabels[plan.plan_type] || plan.plan_type}
                    </span>
                  </div>

                  <h3 className="text-lg font-semibold text-surface-100 mb-1">{plan.name}</h3>

                  {plan.description && (
                    <p className="text-surface-600 text-sm mb-4 line-clamp-2">{plan.description}</p>
                  )}

                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-surface-600">Contacts</span>
                      <span className="text-surface-700 flex items-center gap-1">
                        <UserGroupIcon className="w-4 h-4" />
                        {plan.contact_count || 0}
                      </span>
                    </div>
                    {plan.bcdr_plan_title && (
                      <div className="flex justify-between">
                        <span className="text-surface-600">Linked Plan</span>
                        <span className="text-surface-700 truncate max-w-32">
                          {plan.bcdr_plan_title}
                        </span>
                      </div>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
