import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  BoltIcon,
  PlusIcon,
  MagnifyingGlassIcon,
  XMarkIcon,
  TagIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';

interface Scenario {
  id: string;
  title: string;
  description: string;
  category: string;
  threatActor: string;
  attackVector: string;
  targetAssets: string[];
  likelihood: string;
  impact: string;
  tags: string[];
  isTemplate: boolean;
  usageCount: number;
  createdAt: string;
}

const THREAT_ACTORS = [
  { value: 'external_attacker', label: 'External Attacker' },
  { value: 'insider_malicious', label: 'Malicious Insider' },
  { value: 'insider_negligent', label: 'Negligent Insider' },
  { value: 'nation_state', label: 'Nation State' },
  { value: 'organized_crime', label: 'Organized Crime' },
  { value: 'hacktivist', label: 'Hacktivist' },
  { value: 'competitor', label: 'Competitor' },
  { value: 'natural_disaster', label: 'Natural Disaster' },
];

const ATTACK_VECTORS = [
  { value: 'phishing', label: 'Phishing' },
  { value: 'malware', label: 'Malware' },
  { value: 'social_engineering', label: 'Social Engineering' },
  { value: 'brute_force', label: 'Brute Force' },
  { value: 'supply_chain', label: 'Supply Chain' },
  { value: 'physical', label: 'Physical Access' },
  { value: 'insider_access', label: 'Insider Access' },
  { value: 'web_application', label: 'Web Application' },
  { value: 'network', label: 'Network Attack' },
  { value: 'api', label: 'API Exploitation' },
];

const CATEGORIES = [
  'Data Breach',
  'System Compromise',
  'Service Disruption',
  'Financial Fraud',
  'Compliance Violation',
  'Reputation Damage',
  'Physical Security',
  'Third Party Risk',
];

// Mock data for scenarios - in a real app this would come from API
const mockScenarios: Scenario[] = [
  {
    id: '1',
    title: 'Phishing Attack on Employees',
    description: 'Targeted phishing campaign to obtain employee credentials and access corporate systems',
    category: 'Data Breach',
    threatActor: 'external_attacker',
    attackVector: 'phishing',
    targetAssets: ['Email System', 'Corporate Network', 'User Credentials'],
    likelihood: 'likely',
    impact: 'major',
    tags: ['email', 'credentials', 'social-engineering'],
    isTemplate: true,
    usageCount: 15,
    createdAt: '2024-01-15',
  },
  {
    id: '2',
    title: 'Ransomware Infection',
    description: 'Ransomware attack encrypting critical business data and demanding payment',
    category: 'System Compromise',
    threatActor: 'organized_crime',
    attackVector: 'malware',
    targetAssets: ['File Servers', 'Databases', 'Backup Systems'],
    likelihood: 'possible',
    impact: 'severe',
    tags: ['ransomware', 'encryption', 'extortion'],
    isTemplate: true,
    usageCount: 12,
    createdAt: '2024-01-20',
  },
  {
    id: '3',
    title: 'Insider Data Theft',
    description: 'Employee with access to sensitive data exfiltrates information before leaving company',
    category: 'Data Breach',
    threatActor: 'insider_malicious',
    attackVector: 'insider_access',
    targetAssets: ['Customer Database', 'Financial Records', 'IP/Trade Secrets'],
    likelihood: 'possible',
    impact: 'major',
    tags: ['insider', 'data-theft', 'exfiltration'],
    isTemplate: true,
    usageCount: 8,
    createdAt: '2024-02-01',
  },
  {
    id: '4',
    title: 'DDoS Attack on Public Services',
    description: 'Distributed denial of service attack targeting public-facing web applications',
    category: 'Service Disruption',
    threatActor: 'hacktivist',
    attackVector: 'network',
    targetAssets: ['Web Servers', 'Load Balancers', 'CDN'],
    likelihood: 'likely',
    impact: 'moderate',
    tags: ['ddos', 'availability', 'web'],
    isTemplate: true,
    usageCount: 6,
    createdAt: '2024-02-10',
  },
  {
    id: '5',
    title: 'Supply Chain Compromise',
    description: 'Third-party vendor compromise leading to access to internal systems',
    category: 'Third Party Risk',
    threatActor: 'nation_state',
    attackVector: 'supply_chain',
    targetAssets: ['Vendor Integrations', 'API Connections', 'Shared Systems'],
    likelihood: 'unlikely',
    impact: 'severe',
    tags: ['supply-chain', 'vendor', 'solarwinds-style'],
    isTemplate: true,
    usageCount: 4,
    createdAt: '2024-02-15',
  },
];

export default function RiskScenarios() {
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedScenario, setSelectedScenario] = useState<Scenario | null>(null);

  // In a real app, fetch from API
  const scenarios = mockScenarios;

  const filteredScenarios = scenarios.filter(s => {
    const matchesSearch =
      s.title.toLowerCase().includes(search.toLowerCase()) ||
      s.description.toLowerCase().includes(search.toLowerCase()) ||
      s.tags.some(t => t.toLowerCase().includes(search.toLowerCase()));
    const matchesCategory = !selectedCategory || s.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const getLikelihoodColor = (likelihood: string) => {
    switch (likelihood) {
      case 'almost_certain':
        return 'text-red-400 bg-red-500/20';
      case 'likely':
        return 'text-orange-400 bg-orange-500/20';
      case 'possible':
        return 'text-amber-400 bg-amber-500/20';
      case 'unlikely':
        return 'text-blue-400 bg-blue-500/20';
      case 'rare':
        return 'text-surface-400 bg-surface-500/20';
      default:
        return 'text-surface-400 bg-surface-500/20';
    }
  };

  const getImpactColor = (impact: string) => {
    switch (impact) {
      case 'severe':
        return 'text-red-400 bg-red-500/20';
      case 'major':
        return 'text-orange-400 bg-orange-500/20';
      case 'moderate':
        return 'text-amber-400 bg-amber-500/20';
      case 'minor':
        return 'text-blue-400 bg-blue-500/20';
      case 'negligible':
        return 'text-surface-400 bg-surface-500/20';
      default:
        return 'text-surface-400 bg-surface-500/20';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-white">Risk Scenarios</h1>
          <p className="text-surface-400 mt-1">Threat scenario library for risk assessments</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="px-4 py-2 bg-brand-500 text-white rounded-lg hover:bg-brand-600 flex items-center gap-2"
        >
          <PlusIcon className="w-5 h-5" />
          Create Scenario
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4">
        <div className="flex-1 min-w-[200px]">
          <div className="relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-surface-400" />
            <input
              type="text"
              placeholder="Search scenarios..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-surface-800 border border-surface-700 rounded-lg text-white placeholder-surface-400"
            />
          </div>
        </div>
        <select
          value={selectedCategory}
          onChange={e => setSelectedCategory(e.target.value)}
          className="px-4 py-2 bg-surface-800 border border-surface-700 rounded-lg text-white"
        >
          <option value="">All Categories</option>
          {CATEGORIES.map(cat => (
            <option key={cat} value={cat}>{cat}</option>
          ))}
        </select>
      </div>

      {/* Scenarios Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredScenarios.map(scenario => (
          <div
            key={scenario.id}
            onClick={() => setSelectedScenario(scenario)}
            className="bg-surface-800 rounded-xl border border-surface-700 p-5 hover:border-surface-600 cursor-pointer transition-colors"
          >
            <div className="flex items-start justify-between mb-3">
              <div className="p-2 rounded-lg bg-brand-500/20">
                <BoltIcon className="w-5 h-5 text-brand-400" />
              </div>
              {scenario.isTemplate && (
                <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-400 text-xs rounded">
                  Template
                </span>
              )}
            </div>
            <h3 className="text-white font-medium mb-2">{scenario.title}</h3>
            <p className="text-surface-400 text-sm line-clamp-2 mb-4">{scenario.description}</p>
            
            <div className="flex items-center gap-2 mb-3">
              <span className={`px-2 py-0.5 rounded text-xs ${getLikelihoodColor(scenario.likelihood)}`}>
                {scenario.likelihood.replace('_', ' ')}
              </span>
              <span className={`px-2 py-0.5 rounded text-xs ${getImpactColor(scenario.impact)}`}>
                {scenario.impact}
              </span>
            </div>

            <div className="flex flex-wrap gap-1">
              {scenario.tags.slice(0, 3).map(tag => (
                <span key={tag} className="px-2 py-0.5 bg-surface-700 text-surface-400 text-xs rounded">
                  {tag}
                </span>
              ))}
              {scenario.tags.length > 3 && (
                <span className="px-2 py-0.5 bg-surface-700 text-surface-400 text-xs rounded">
                  +{scenario.tags.length - 3}
                </span>
              )}
            </div>

            <div className="mt-4 pt-3 border-t border-surface-700 flex items-center justify-between text-xs text-surface-500">
              <span>{scenario.category}</span>
              <span>Used {scenario.usageCount} times</span>
            </div>
          </div>
        ))}

        {filteredScenarios.length === 0 && (
          <div className="col-span-full text-center py-12">
            <BoltIcon className="w-12 h-12 text-surface-600 mx-auto mb-3" />
            <p className="text-surface-400">No scenarios found</p>
            <p className="text-surface-500 text-sm mt-1">Try adjusting your search or filters</p>
          </div>
        )}
      </div>

      {/* Scenario Detail Modal */}
      {selectedScenario && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-surface-800 rounded-xl border border-surface-700 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-surface-700 flex items-start justify-between">
              <div>
                <h2 className="text-xl font-semibold text-white">{selectedScenario.title}</h2>
                <p className="text-surface-400 text-sm mt-1">{selectedScenario.category}</p>
              </div>
              <button
                onClick={() => setSelectedScenario(null)}
                className="p-2 hover:bg-surface-700 rounded-lg"
              >
                <XMarkIcon className="w-5 h-5 text-surface-400" />
              </button>
            </div>
            <div className="p-6 space-y-6">
              <div>
                <h3 className="text-sm font-medium text-surface-400 mb-2">Description</h3>
                <p className="text-surface-200">{selectedScenario.description}</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h3 className="text-sm font-medium text-surface-400 mb-2">Threat Actor</h3>
                  <p className="text-white capitalize">
                    {THREAT_ACTORS.find(t => t.value === selectedScenario.threatActor)?.label || selectedScenario.threatActor}
                  </p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-surface-400 mb-2">Attack Vector</h3>
                  <p className="text-white capitalize">
                    {ATTACK_VECTORS.find(v => v.value === selectedScenario.attackVector)?.label || selectedScenario.attackVector}
                  </p>
                </div>
              </div>

              <div>
                <h3 className="text-sm font-medium text-surface-400 mb-2">Target Assets</h3>
                <div className="flex flex-wrap gap-2">
                  {selectedScenario.targetAssets.map(asset => (
                    <span key={asset} className="px-3 py-1 bg-surface-700 text-surface-300 rounded-lg text-sm">
                      {asset}
                    </span>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h3 className="text-sm font-medium text-surface-400 mb-2">Likelihood</h3>
                  <span className={`px-3 py-1 rounded text-sm capitalize ${getLikelihoodColor(selectedScenario.likelihood)}`}>
                    {selectedScenario.likelihood.replace('_', ' ')}
                  </span>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-surface-400 mb-2">Impact</h3>
                  <span className={`px-3 py-1 rounded text-sm capitalize ${getImpactColor(selectedScenario.impact)}`}>
                    {selectedScenario.impact}
                  </span>
                </div>
              </div>

              <div>
                <h3 className="text-sm font-medium text-surface-400 mb-2">Tags</h3>
                <div className="flex flex-wrap gap-2">
                  {selectedScenario.tags.map(tag => (
                    <span key={tag} className="px-2 py-1 bg-brand-500/20 text-brand-400 rounded text-sm flex items-center gap-1">
                      <TagIcon className="w-3 h-3" />
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            </div>
            <div className="p-6 border-t border-surface-700 flex justify-between">
              <button
                onClick={() => setSelectedScenario(null)}
                className="px-4 py-2 bg-surface-700 text-surface-300 rounded-lg"
              >
                Close
              </button>
              <button
                className="px-4 py-2 bg-brand-500 text-white rounded-lg hover:bg-brand-600 flex items-center gap-2"
              >
                <ExclamationTriangleIcon className="w-4 h-4" />
                Use for New Risk
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Scenario Modal */}
      {showCreateModal && (
        <CreateScenarioModal onClose={() => setShowCreateModal(false)} />
      )}
    </div>
  );
}

function CreateScenarioModal({ onClose }: { onClose: () => void }) {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: '',
    threatActor: '',
    attackVector: '',
    targetAssets: '',
    likelihood: 'possible',
    impact: 'moderate',
    tags: '',
    isTemplate: true,
  });

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-surface-800 rounded-xl border border-surface-700 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-surface-700 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-white">Create Scenario</h2>
          <button onClick={onClose} className="p-2 hover:bg-surface-700 rounded-lg">
            <XMarkIcon className="w-5 h-5 text-surface-400" />
          </button>
        </div>
        <form className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-surface-300 mb-2">Title *</label>
            <input
              type="text"
              value={formData.title}
              onChange={e => setFormData(prev => ({ ...prev, title: e.target.value }))}
              className="w-full px-4 py-2 bg-surface-700 border border-surface-600 rounded-lg text-white"
              placeholder="e.g., Phishing Attack on Employees"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-surface-300 mb-2">Description *</label>
            <textarea
              value={formData.description}
              onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))}
              rows={3}
              className="w-full px-4 py-2 bg-surface-700 border border-surface-600 rounded-lg text-white"
              placeholder="Describe the threat scenario..."
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-surface-300 mb-2">Category</label>
              <select
                value={formData.category}
                onChange={e => setFormData(prev => ({ ...prev, category: e.target.value }))}
                className="w-full px-4 py-2 bg-surface-700 border border-surface-600 rounded-lg text-white"
              >
                <option value="">Select...</option>
                {CATEGORIES.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-surface-300 mb-2">Threat Actor</label>
              <select
                value={formData.threatActor}
                onChange={e => setFormData(prev => ({ ...prev, threatActor: e.target.value }))}
                className="w-full px-4 py-2 bg-surface-700 border border-surface-600 rounded-lg text-white"
              >
                <option value="">Select...</option>
                {THREAT_ACTORS.map(actor => (
                  <option key={actor.value} value={actor.value}>{actor.label}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-surface-300 mb-2">Attack Vector</label>
              <select
                value={formData.attackVector}
                onChange={e => setFormData(prev => ({ ...prev, attackVector: e.target.value }))}
                className="w-full px-4 py-2 bg-surface-700 border border-surface-600 rounded-lg text-white"
              >
                <option value="">Select...</option>
                {ATTACK_VECTORS.map(vec => (
                  <option key={vec.value} value={vec.value}>{vec.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-surface-300 mb-2">Target Assets</label>
              <input
                type="text"
                value={formData.targetAssets}
                onChange={e => setFormData(prev => ({ ...prev, targetAssets: e.target.value }))}
                className="w-full px-4 py-2 bg-surface-700 border border-surface-600 rounded-lg text-white"
                placeholder="Comma separated"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-surface-300 mb-2">Likelihood</label>
              <select
                value={formData.likelihood}
                onChange={e => setFormData(prev => ({ ...prev, likelihood: e.target.value }))}
                className="w-full px-4 py-2 bg-surface-700 border border-surface-600 rounded-lg text-white"
              >
                <option value="rare">Rare</option>
                <option value="unlikely">Unlikely</option>
                <option value="possible">Possible</option>
                <option value="likely">Likely</option>
                <option value="almost_certain">Almost Certain</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-surface-300 mb-2">Impact</label>
              <select
                value={formData.impact}
                onChange={e => setFormData(prev => ({ ...prev, impact: e.target.value }))}
                className="w-full px-4 py-2 bg-surface-700 border border-surface-600 rounded-lg text-white"
              >
                <option value="negligible">Negligible</option>
                <option value="minor">Minor</option>
                <option value="moderate">Moderate</option>
                <option value="major">Major</option>
                <option value="severe">Severe</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-surface-300 mb-2">Tags</label>
            <input
              type="text"
              value={formData.tags}
              onChange={e => setFormData(prev => ({ ...prev, tags: e.target.value }))}
              className="w-full px-4 py-2 bg-surface-700 border border-surface-600 rounded-lg text-white"
              placeholder="Comma separated tags"
            />
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="isTemplate"
              checked={formData.isTemplate}
              onChange={e => setFormData(prev => ({ ...prev, isTemplate: e.target.checked }))}
              className="rounded border-surface-600"
            />
            <label htmlFor="isTemplate" className="text-sm text-surface-300">
              Save as reusable template
            </label>
          </div>
        </form>
        <div className="p-6 border-t border-surface-700 flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 bg-surface-700 text-surface-300 rounded-lg">
            Cancel
          </button>
          <button className="px-4 py-2 bg-brand-500 text-white rounded-lg hover:bg-brand-600">
            Create Scenario
          </button>
        </div>
      </div>
    </div>
  );
}



