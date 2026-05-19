import { memo, useCallback } from 'react';
import { Plus, X, Server } from 'lucide-react';

interface Asset {
  id: string;
  assetId?: string;
  name: string;
  type?: string;
  status?: string;
  criticality?: string;
}

interface RiskAssetsTabProps {
  assets: Asset[];
  onLinkAsset: () => void;
  onUnlinkAsset: (assetId: string) => void;
  isUnlinking?: boolean;
}

const getCriticalityColor = (criticality?: string) => {
  switch (criticality) {
    case 'critical':
      return 'bg-red-500/20 text-red-600';
    case 'high':
      return 'bg-orange-500/20 text-orange-600';
    case 'medium':
      return 'bg-amber-500/20 text-amber-600';
    case 'low':
      return 'bg-emerald-500/20 text-emerald-600';
    default:
      return 'bg-surface-500/20 text-surface-600';
  }
};

function RiskAssetsTab({
  assets,
  onLinkAsset,
  onUnlinkAsset,
  isUnlinking = false,
}: RiskAssetsTabProps) {
  const handleUnlink = useCallback(
    (assetId: string) => {
      onUnlinkAsset(assetId);
    },
    [onUnlinkAsset]
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium text-white">Affected Assets</h3>
        <button
          onClick={onLinkAsset}
          className="px-3 py-2 bg-brand-500 text-white rounded-lg hover:bg-brand-600 flex items-center gap-2 text-sm"
        >
          <Plus className="w-4 h-4" />
          Link Asset
        </button>
      </div>

      {assets.length === 0 ? (
        <div className="text-center py-8 text-surface-600">
          <Server className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>No assets linked to this risk</p>
          <button onClick={onLinkAsset} className="mt-3 text-brand-400 hover:text-brand-300">
            Link an asset
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          {assets.map((asset) => (
            <div
              key={asset.id}
              className="flex items-center justify-between p-4 bg-surface-900 rounded-lg border border-surface-700"
            >
              <div className="flex items-center gap-4">
                <Server className="w-5 h-5 text-surface-600" />
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-brand-400 font-mono text-sm">{asset.assetId}</span>
                    <span className="text-white">{asset.name}</span>
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    {asset.type && (
                      <span className="text-xs text-surface-600 capitalize">{asset.type}</span>
                    )}
                    {asset.criticality && (
                      <span
                        className={`text-xs px-2 py-0.5 rounded ${getCriticalityColor(
                          asset.criticality
                        )}`}
                      >
                        {asset.criticality}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <button
                onClick={() => handleUnlink(asset.id)}
                disabled={isUnlinking}
                className="p-2 hover:bg-red-500/20 rounded-lg text-red-600 disabled:opacity-50"
                title="Unlink asset"
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

export default memo(RiskAssetsTab);
