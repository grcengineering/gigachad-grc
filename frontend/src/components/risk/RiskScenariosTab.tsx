import { Plus, Trash2, DollarSign, Percent } from 'lucide-react';

interface Scenario {
  id: string;
  name: string;
  description?: string;
  probability?: number;
  impact?: number;
  expectedLoss?: number;
}

interface RiskScenariosTabProps {
  scenarios: Scenario[];
  onAddScenario: () => void;
  onDeleteScenario: (scenarioId: string) => void;
  isDeleting?: boolean;
}

export default function RiskScenariosTab({
  scenarios,
  onAddScenario,
  onDeleteScenario,
  isDeleting = false,
}: RiskScenariosTabProps) {
  const formatCurrency = (value?: number) => {
    if (value === undefined) return '-';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatPercent = (value?: number) => {
    if (value === undefined) return '-';
    return `${(value * 100).toFixed(0)}%`;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium text-white">Risk Scenarios (FAIR)</h3>
        <button
          onClick={onAddScenario}
          className="px-3 py-2 bg-brand-500 text-white rounded-lg hover:bg-brand-600 flex items-center gap-2 text-sm"
        >
          <Plus className="w-4 h-4" />
          Add Scenario
        </button>
      </div>

      {scenarios.length === 0 ? (
        <div className="text-center py-8 text-surface-600">
          <DollarSign className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>No scenarios defined</p>
          <p className="text-sm mt-1">Add FAIR-based scenarios to quantify risk impact</p>
          <button onClick={onAddScenario} className="mt-3 text-brand-400 hover:text-brand-300">
            Add first scenario
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {scenarios.map((scenario) => (
            <div
              key={scenario.id}
              className="p-4 bg-surface-900 rounded-lg border border-surface-700"
            >
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-white font-medium">{scenario.name}</h4>
                <button
                  onClick={() => onDeleteScenario(scenario.id)}
                  disabled={isDeleting}
                  className="p-2 hover:bg-red-500/20 rounded-lg text-red-600 disabled:opacity-50"
                  title="Delete scenario"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
              {scenario.description && (
                <p className="text-sm text-surface-600 mb-3">{scenario.description}</p>
              )}
              <div className="grid grid-cols-3 gap-4">
                <div className="flex items-center gap-2">
                  <Percent className="w-4 h-4 text-surface-600" />
                  <div>
                    <div className="text-xs text-surface-600">Probability</div>
                    <div className="text-white">{formatPercent(scenario.probability)}</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-surface-600" />
                  <div>
                    <div className="text-xs text-surface-600">Impact</div>
                    <div className="text-white">{formatCurrency(scenario.impact)}</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-amber-600" />
                  <div>
                    <div className="text-xs text-surface-600">Expected Loss</div>
                    <div className="text-amber-600">{formatCurrency(scenario.expectedLoss)}</div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
