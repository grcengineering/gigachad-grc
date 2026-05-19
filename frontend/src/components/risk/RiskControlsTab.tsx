import { memo, useCallback } from 'react';
import { Plus, X, Target } from 'lucide-react';

import { SelectNative } from '@/components/ui/SelectNative';

interface Control {
  id: string;
  controlId?: string;
  title: string;
  status?: string;
  effectiveness?: string;
}

interface RiskControlsTabProps {
  controls: Control[];
  onLinkControl: () => void;
  onUnlinkControl: (controlId: string) => void;
  onUpdateEffectiveness?: (controlId: string, effectiveness: string) => void;
  isUnlinking?: boolean;
}

const CONTROL_EFFECTIVENESS = [
  { value: 'none', label: 'None', color: 'text-red-600' },
  { value: 'partial', label: 'Partial', color: 'text-amber-600' },
  { value: 'full', label: 'Full', color: 'text-emerald-600' },
];

function RiskControlsTab({
  controls,
  onLinkControl,
  onUnlinkControl,
  onUpdateEffectiveness,
  isUnlinking = false,
}: RiskControlsTabProps) {
  const handleUnlink = useCallback(
    (controlId: string) => {
      onUnlinkControl(controlId);
    },
    [onUnlinkControl]
  );
  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'implemented':
        return 'bg-emerald-500/20 text-emerald-600';
      case 'in_progress':
        return 'bg-amber-500/20 text-amber-600';
      case 'planned':
        return 'bg-blue-500/20 text-blue-600';
      default:
        return 'bg-surface-500/20 text-surface-600';
    }
  };

  const getEffectivenessColor = (effectiveness?: string) => {
    const config = CONTROL_EFFECTIVENESS.find((e) => e.value === effectiveness);
    return config?.color || 'text-surface-600';
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium text-white">Mitigating Controls</h3>
        <button
          onClick={onLinkControl}
          className="px-3 py-2 bg-brand-500 text-white rounded-lg hover:bg-brand-600 flex items-center gap-2 text-sm"
        >
          <Plus className="w-4 h-4" />
          Link Control
        </button>
      </div>
      {controls.length === 0 ? (
        <div className="text-center py-8 text-surface-600">
          <Target className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>No controls linked to this risk</p>
          <button onClick={onLinkControl} className="mt-3 text-brand-400 hover:text-brand-300">
            Link a control
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          {controls.map((control) => (
            <div
              key={control.id}
              className="flex items-center justify-between p-4 bg-surface-900 rounded-lg border border-surface-700"
            >
              <div className="flex items-center gap-4">
                <Target className="w-5 h-5 text-surface-600" />
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-brand-400 font-mono text-sm">{control.controlId}</span>
                    <span className="text-white">{control.title}</span>
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    {control.status && (
                      <span
                        className={`text-xs px-2 py-0.5 rounded ${getStatusColor(control.status)}`}
                      >
                        {control.status?.replace('_', ' ')}
                      </span>
                    )}
                    {control.effectiveness && onUpdateEffectiveness && (
                      <SelectNative
                        value={control.effectiveness}
                        onChange={(e) => onUpdateEffectiveness(control.id, e.target.value)}
                        className={`text-xs bg-transparent border-none cursor-pointer ${getEffectivenessColor(
                          control.effectiveness
                        )}`}
                      >
                        {CONTROL_EFFECTIVENESS.map((eff) => (
                          <option key={eff.value} value={eff.value}>
                            {eff.label} Effectiveness
                          </option>
                        ))}
                      </SelectNative>
                    )}
                  </div>
                </div>
              </div>
              <button
                onClick={() => handleUnlink(control.id)}
                disabled={isUnlinking}
                className="p-2 hover:bg-red-500/20 rounded-lg text-red-600 disabled:opacity-50"
                title="Unlink control"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default memo(RiskControlsTab);
