import { useState } from 'react';
import { Zap, Plus, Search, Tag, AlertTriangle } from 'lucide-react';
import {
  Button,
  Badge,
  Card,
  CardBody,
  Input,
  Textarea,
  Label,
  Select,
  PageHeader,
  FilterBar,
  EmptyState,
  Dialog,
  type BadgeVariant,
  type ActiveFilter,
} from '@/components/ui';

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

const CATEGORY_OPTS = CATEGORIES.map((c) => ({ value: c, label: c }));

const LIKELIHOOD_OPTS = [
  { value: 'rare', label: 'Rare' },
  { value: 'unlikely', label: 'Unlikely' },
  { value: 'possible', label: 'Possible' },
  { value: 'likely', label: 'Likely' },
  { value: 'almost_certain', label: 'Almost Certain' },
];

const IMPACT_OPTS = [
  { value: 'negligible', label: 'Negligible' },
  { value: 'minor', label: 'Minor' },
  { value: 'moderate', label: 'Moderate' },
  { value: 'major', label: 'Major' },
  { value: 'severe', label: 'Severe' },
];

const LIKELIHOOD_VARIANT: Record<string, BadgeVariant> = {
  almost_certain: 'danger',
  likely: 'danger',
  possible: 'warning',
  unlikely: 'info',
  rare: 'neutral',
};

const IMPACT_VARIANT: Record<string, BadgeVariant> = {
  severe: 'danger',
  major: 'danger',
  moderate: 'warning',
  minor: 'info',
  negligible: 'neutral',
};

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
  const [selectedCategory, setSelectedCategory] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedScenario, setSelectedScenario] = useState<Scenario | null>(null);

  const scenarios = mockScenarios;
  const filteredScenarios = scenarios.filter((s) => {
    const matchesSearch =
      s.title.toLowerCase().includes(search.toLowerCase()) ||
      s.description.toLowerCase().includes(search.toLowerCase()) ||
      s.tags.some((t) => t.toLowerCase().includes(search.toLowerCase()));
    const matchesCategory = !selectedCategory || s.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const activeFilters: ActiveFilter[] = [];
  if (search) activeFilters.push({ key: 'search', label: `Search: ${search}`, onClear: () => setSearch('') });
  if (selectedCategory) activeFilters.push({ key: 'category', label: `Category: ${selectedCategory}`, onClear: () => setSelectedCategory('') });
  const clearAll = () => {
    setSearch('');
    setSelectedCategory('');
  };

  return (
    <div className="space-y-5 animate-fade-in">
      <PageHeader
        title="Risk Scenarios"
        description="Threat scenario library for risk assessments."
        actions={
          <Button size="sm" leftIcon={<Plus className="h-4 w-4" />} onClick={() => setShowCreateModal(true)}>
            Create Scenario
          </Button>
        }
      />

      <FilterBar active={activeFilters} onClearAll={activeFilters.length ? clearAll : undefined}>
        <Input
          inputSize="sm"
          className="w-72"
          placeholder="Search scenarios…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          leftIcon={<Search className="h-4 w-4" />}
        />
        <Select
          size="sm"
          fullWidth={false}
          className="w-56"
          placeholder="All Categories"
          value={selectedCategory}
          onChange={setSelectedCategory}
          options={CATEGORY_OPTS}
          clearable
        />
      </FilterBar>

      {filteredScenarios.length === 0 ? (
        <Card>
          <EmptyState
            icon={<Zap className="h-8 w-8" />}
            title="No scenarios found"
            description="Try adjusting your search or filters."
          />
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredScenarios.map((scenario) => (
            <Card
              key={scenario.id}
              interactive
              onClick={() => setSelectedScenario(scenario)}
              className="hover:border-surface-400"
            >
              <CardBody density="comfy">
                <div className="flex items-start justify-between mb-3">
                  <div className="p-2 rounded-md bg-brand-500/10">
                    <Zap className="h-5 w-5 text-brand-700" />
                  </div>
                  {scenario.isTemplate && (
                    <Badge variant="success" size="sm">
                      Template
                    </Badge>
                  )}
                </div>
                <h3 className="text-h3 text-surface-900 mb-1.5">{scenario.title}</h3>
                <p className="text-small text-surface-600 line-clamp-2 mb-3">{scenario.description}</p>
                <div className="flex items-center gap-2 mb-3">
                  <Badge variant={LIKELIHOOD_VARIANT[scenario.likelihood] ?? 'neutral'} className="capitalize">
                    {scenario.likelihood.replace(/_/g, ' ')}
                  </Badge>
                  <Badge variant={IMPACT_VARIANT[scenario.impact] ?? 'neutral'} className="capitalize">
                    {scenario.impact}
                  </Badge>
                </div>
                <div className="flex flex-wrap gap-1">
                  {scenario.tags.slice(0, 3).map((tag) => (
                    <Badge key={tag} variant="neutral" size="sm">
                      {tag}
                    </Badge>
                  ))}
                  {scenario.tags.length > 3 && (
                    <Badge variant="neutral" size="sm">
                      +{scenario.tags.length - 3}
                    </Badge>
                  )}
                </div>
                <div className="mt-3 pt-3 border-t border-surface-200 flex items-center justify-between text-xs text-surface-500">
                  <span>{scenario.category}</span>
                  <span>Used {scenario.usageCount} times</span>
                </div>
              </CardBody>
            </Card>
          ))}
        </div>
      )}

      {/* Scenario Detail */}
      <Dialog
        open={!!selectedScenario}
        onClose={() => setSelectedScenario(null)}
        title={selectedScenario?.title ?? ''}
        description={selectedScenario?.category}
        size="lg"
        footer={
          <>
            <Button variant="ghost" onClick={() => setSelectedScenario(null)}>Close</Button>
            <Button leftIcon={<AlertTriangle className="h-4 w-4" />}>Use for New Risk</Button>
          </>
        }
      >
        {selectedScenario && (
          <div className="space-y-5">
            <div>
              <h3 className="text-xs font-medium text-surface-500 uppercase tracking-wider mb-1.5">
                Description
              </h3>
              <p className="text-body text-surface-800">{selectedScenario.description}</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <h3 className="text-xs font-medium text-surface-500 uppercase tracking-wider mb-1.5">
                  Threat Actor
                </h3>
                <p className="text-body text-surface-900">
                  {THREAT_ACTORS.find((t) => t.value === selectedScenario.threatActor)?.label ?? selectedScenario.threatActor}
                </p>
              </div>
              <div>
                <h3 className="text-xs font-medium text-surface-500 uppercase tracking-wider mb-1.5">
                  Attack Vector
                </h3>
                <p className="text-body text-surface-900">
                  {ATTACK_VECTORS.find((v) => v.value === selectedScenario.attackVector)?.label ?? selectedScenario.attackVector}
                </p>
              </div>
            </div>

            <div>
              <h3 className="text-xs font-medium text-surface-500 uppercase tracking-wider mb-1.5">
                Target Assets
              </h3>
              <div className="flex flex-wrap gap-2">
                {selectedScenario.targetAssets.map((asset) => (
                  <Badge key={asset} variant="neutral">
                    {asset}
                  </Badge>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <h3 className="text-xs font-medium text-surface-500 uppercase tracking-wider mb-1.5">
                  Likelihood
                </h3>
                <Badge variant={LIKELIHOOD_VARIANT[selectedScenario.likelihood] ?? 'neutral'} className="capitalize">
                  {selectedScenario.likelihood.replace(/_/g, ' ')}
                </Badge>
              </div>
              <div>
                <h3 className="text-xs font-medium text-surface-500 uppercase tracking-wider mb-1.5">
                  Impact
                </h3>
                <Badge variant={IMPACT_VARIANT[selectedScenario.impact] ?? 'neutral'} className="capitalize">
                  {selectedScenario.impact}
                </Badge>
              </div>
            </div>

            <div>
              <h3 className="text-xs font-medium text-surface-500 uppercase tracking-wider mb-1.5">
                Tags
              </h3>
              <div className="flex flex-wrap gap-2">
                {selectedScenario.tags.map((tag) => (
                  <Badge key={tag} variant="brand" className="inline-flex items-center gap-1">
                    <Tag className="h-3 w-3" />
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>
          </div>
        )}
      </Dialog>

      {showCreateModal && <CreateScenarioModal onClose={() => setShowCreateModal(false)} />}
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
    <Dialog
      open
      onClose={onClose}
      title="Create Scenario"
      size="lg"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button>Create Scenario</Button>
        </>
      }
    >
      <div className="space-y-4">
        <div>
          <Label htmlFor="sc-title" required>Title</Label>
          <Input
            id="sc-title"
            value={formData.title}
            onChange={(e) => setFormData((prev) => ({ ...prev, title: e.target.value }))}
            placeholder="e.g., Phishing Attack on Employees"
          />
        </div>
        <div>
          <Label htmlFor="sc-desc" required>Description</Label>
          <Textarea
            id="sc-desc"
            value={formData.description}
            onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
            rows={3}
            placeholder="Describe the threat scenario…"
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>Category</Label>
            <Select
              value={formData.category}
              onChange={(v) => setFormData((p) => ({ ...p, category: v }))}
              options={CATEGORY_OPTS}
              placeholder="Select…"
            />
          </div>
          <div>
            <Label>Threat Actor</Label>
            <Select
              value={formData.threatActor}
              onChange={(v) => setFormData((p) => ({ ...p, threatActor: v }))}
              options={THREAT_ACTORS}
              placeholder="Select…"
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>Attack Vector</Label>
            <Select
              value={formData.attackVector}
              onChange={(v) => setFormData((p) => ({ ...p, attackVector: v }))}
              options={ATTACK_VECTORS}
              placeholder="Select…"
            />
          </div>
          <div>
            <Label htmlFor="sc-targets">Target Assets</Label>
            <Input
              id="sc-targets"
              value={formData.targetAssets}
              onChange={(e) => setFormData((p) => ({ ...p, targetAssets: e.target.value }))}
              placeholder="Comma separated"
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>Likelihood</Label>
            <Select
              value={formData.likelihood}
              onChange={(v) => setFormData((p) => ({ ...p, likelihood: v }))}
              options={LIKELIHOOD_OPTS}
            />
          </div>
          <div>
            <Label>Impact</Label>
            <Select
              value={formData.impact}
              onChange={(v) => setFormData((p) => ({ ...p, impact: v }))}
              options={IMPACT_OPTS}
            />
          </div>
        </div>
        <div>
          <Label htmlFor="sc-tags">Tags</Label>
          <Input
            id="sc-tags"
            value={formData.tags}
            onChange={(e) => setFormData((p) => ({ ...p, tags: e.target.value }))}
            placeholder="Comma separated tags"
          />
        </div>
        <label className="flex items-center gap-2 text-small text-surface-700 cursor-pointer">
          <input
            type="checkbox"
            checked={formData.isTemplate}
            onChange={(e) => setFormData((p) => ({ ...p, isTemplate: e.target.checked }))}
            className="rounded border-surface-400 bg-surface-100 text-brand-500 focus:ring-brand-500 focus:ring-offset-white"
          />
          Save as reusable template
        </label>
      </div>
    </Dialog>
  );
}
