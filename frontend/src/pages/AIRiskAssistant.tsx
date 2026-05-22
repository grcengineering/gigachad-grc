import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Button } from '@/components/ui/Button';
import { Textarea } from '@/components/Form';
import { useToast } from '@/hooks/useToast';
import { useModules } from '@/contexts/ModuleContext';
import { api } from '@/lib/api';

interface AIRiskSuggestion {
  summary: string;
  suggestedCategory?: string;
  suggestedLikelihood?: string;
  suggestedImpact?: string;
  suggestedTreatmentPlan?: string;
}

async function analyzeRisk(description: string): Promise<AIRiskSuggestion> {
  const response = await api.post('/api/mcp/ai/analyze-risk', {
    description,
  });
  return response.data;
}

export default function AIRiskAssistant() {
  const [description, setDescription] = useState('');
  const toast = useToast();
  const { isModuleEnabled } = useModules();
  const aiEnabled = isModuleEnabled('ai');

  const {
    mutate,
    data,
    isPending: isLoading,
  } = useMutation({
    mutationFn: analyzeRisk,
    onError: () => {
      toast.error('AI analysis failed. Please try again or adjust your description.');
    },
  });

  if (!aiEnabled) {
    return (
      <div className="p-6 space-y-4">
        <h1 className="text-2xl font-semibold text-white">AI Risk Assistant</h1>
        <p className="text-surface-600">
          The AI module is not enabled for this environment. Ask an administrator to set
          <code className="mx-1 text-xs bg-white px-2 py-1 rounded">
            VITE_ENABLE_AI_MODULE=true
          </code>
          and provide AI provider API keys.
        </p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-semibold text-white">AI Risk Assistant</h1>
        <p className="text-surface-600 mt-1">
          Paste a risk description and let the AI assistant suggest categorization and a treatment
          plan.
        </p>
      </div>

      <div className="card p-4 space-y-4">
        <div>
          <label className="label">Risk Description</label>
          <Textarea
            rows={6}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe the risk scenario, affected assets, potential impact, and any existing controls..."
          />
        </div>

        <div className="flex justify-end">
          <Button
            type="button"
            onClick={() => mutate(description)}
            disabled={!description.trim() || isLoading}
          >
            {isLoading ? 'Analyzing...' : 'Analyze Risk'}
          </Button>
        </div>
      </div>

      {data && (
        <div className="card p-4 space-y-3">
          <h2 className="text-lg font-semibold text-white">Suggested Analysis</h2>
          {data.summary && <p className="text-surface-700 whitespace-pre-wrap">{data.summary}</p>}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2 text-sm">
            {data.suggestedCategory && (
              <div>
                <p className="text-surface-500">Category</p>
                <p className="text-surface-900 font-medium">{data.suggestedCategory}</p>
              </div>
            )}
            {data.suggestedLikelihood && (
              <div>
                <p className="text-surface-500">Likelihood</p>
                <p className="text-surface-900 font-medium">{data.suggestedLikelihood}</p>
              </div>
            )}
            {data.suggestedImpact && (
              <div>
                <p className="text-surface-500">Impact</p>
                <p className="text-surface-900 font-medium">{data.suggestedImpact}</p>
              </div>
            )}
            {data.suggestedTreatmentPlan && (
              <div className="md:col-span-2">
                <p className="text-surface-500">Treatment Plan</p>
                <p className="text-surface-900 whitespace-pre-wrap">
                  {data.suggestedTreatmentPlan}
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
