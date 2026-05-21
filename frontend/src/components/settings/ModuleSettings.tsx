import { useEffect, useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { permissionsApi } from '@/lib/api';
import { useModules, MODULE_DEFINITIONS, ModuleId, MODULE_PRESETS } from '@/contexts/ModuleContext';
import { Button } from '@/components/ui/Button';
import toast from 'react-hot-toast';

type ModuleConfigApiResponse = { enabledModules: string[] };

export function ModuleSettings() {
  const queryClient = useQueryClient();
  const { enabledModules, _refreshFromOrgConfig } = useModules();
  const [selectedModules, setSelectedModules] = useState<Set<ModuleId>>(new Set(enabledModules));

  const { data, isLoading } = useQuery<ModuleConfigApiResponse>({
    queryKey: ['org-modules'],
    queryFn: async () => {
      const res = await permissionsApi.getModules();
      return res.data;
    },
  });

  // Sync local state & ModuleContext when API config loads
  // Only update if we have valid data - don't update on errors
  useEffect(() => {
    if (
      data &&
      data.enabledModules &&
      Array.isArray(data.enabledModules) &&
      _refreshFromOrgConfig
    ) {
      _refreshFromOrgConfig(data.enabledModules);
    }
    // Don't call refreshFromOrgConfig if data is null/undefined or if there's an error
    // This prevents clearing enabled modules when API fails
  }, [data, _refreshFromOrgConfig]);

  useEffect(() => {
    setSelectedModules(new Set(enabledModules));
  }, [enabledModules]);

  const toggleModule = (id: ModuleId) => {
    setSelectedModules((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const applyPreset = (presetId: string) => {
    const preset = MODULE_PRESETS.find((p) => p.id === presetId);
    if (!preset) return;
    setSelectedModules(new Set(preset.modules));
  };

  const selectedPreset = useMemo(() => {
    const current = Array.from(selectedModules).sort();
    const match = MODULE_PRESETS.find((preset) => {
      const mods = [...preset.modules].sort();
      return current.length === mods.length && current.every((m, i) => m === mods[i]);
    });
    return match || null;
  }, [selectedModules]);

  const mutation = useMutation({
    mutationFn: async (modules: string[]) => {
      const res = await permissionsApi.updateModules(modules);
      return res.data;
    },
    onSuccess: (res) => {
      toast.success('Module configuration saved');
      queryClient.invalidateQueries({ queryKey: ['org-modules'] });
      // Only refresh if we have valid enabled modules
      if (_refreshFromOrgConfig && res && Array.isArray(res.enabledModules)) {
        try {
          _refreshFromOrgConfig(res.enabledModules);
        } catch (error) {
          console.error('Error refreshing module config:', error);
          // Don't show error toast - module save was successful, just refresh failed
        }
      }
    },
    onError: (error: any) => {
      console.error('Failed to save module configuration:', error);
      toast.error(error.response?.data?.message || 'Failed to save module configuration');
    },
  });

  const handleSave = () => {
    const modules = Array.from(selectedModules);
    mutation.mutate(modules);
  };

  const modulesList = Object.values(MODULE_DEFINITIONS);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-surface-900">Module Configuration</h2>
          <p className="text-surface-600 text-sm mt-1">
            Enable or disable modules for this organization. Deployment defaults act as a baseline;
            changes here apply at the organization level.
          </p>
        </div>
        <Button onClick={handleSave} disabled={mutation.isPending || isLoading}>
          {mutation.isPending ? 'Saving...' : 'Save Configuration'}
        </Button>
      </div>

      <div className="card p-4 space-y-4">
        <h3 className="text-sm font-semibold text-surface-800 mb-2">Presets</h3>
        <div className="flex flex-wrap gap-2">
          {MODULE_PRESETS.map((preset) => (
            <button
              key={preset.id}
              type="button"
              onClick={() => applyPreset(preset.id)}
              className={`px-3 py-1.5 rounded-full text-xs border ${
                selectedPreset?.id === preset.id
                  ? 'bg-brand-500 text-white border-brand-500'
                  : 'bg-white text-surface-700 border-surface-200 hover:bg-white'
              }`}
            >
              {preset.name}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {modulesList.map((mod) => {
          const checked = selectedModules.has(mod.id);
          return (
            <label
              key={mod.id}
              className={`card p-4 flex items-start gap-3 cursor-pointer border ${
                checked
                  ? 'border-brand-500 bg-brand-500/10'
                  : 'border-surface-200 hover:border-surface-300'
              }`}
            >
              <input
                type="checkbox"
                className="mt-1"
                checked={checked}
                onChange={() => toggleModule(mod.id)}
              />
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-surface-900">{mod.name}</span>
                  {!checked && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-white text-surface-600">
                      Disabled
                    </span>
                  )}
                </div>
                <p className="text-xs text-surface-600 mt-1">{mod.description}</p>
                <p className="text-[10px] text-surface-500 mt-1">
                  Env var: <code className="font-mono">{mod.envVar}</code>
                </p>
              </div>
            </label>
          );
        })}
      </div>
    </div>
  );
}
