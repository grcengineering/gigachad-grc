import { useNavigate, useLocation } from 'react-router-dom';
import { LockClosedIcon, ArrowLeftIcon, Cog6ToothIcon } from '@heroicons/react/24/outline';
import { Button } from '@/components/ui/Button';
import { MODULE_DEFINITIONS, ModuleId } from '@/contexts/ModuleContext';

interface DisabledModulePageProps {
  moduleId?: ModuleId;
}

/**
 * Shown when a user navigates to a route belonging to a disabled module.
 * Provides helpful information about enabling the module.
 */
export default function DisabledModulePage({ moduleId }: DisabledModulePageProps) {
  const navigate = useNavigate();
  const location = useLocation();

  // Try to detect which module based on current path if not provided
  const detectedModuleId = moduleId || detectModuleFromPath(location.pathname);
  const moduleDefinition = detectedModuleId ? MODULE_DEFINITIONS[detectedModuleId] : null;

  return (
    <div className="min-h-[60vh] flex items-center justify-center p-6">
      <div className="max-w-lg w-full text-center">
        {/* Icon */}
        <div className="mx-auto w-20 h-20 rounded-full bg-white flex items-center justify-center mb-6">
          <LockClosedIcon className="w-10 h-10 text-surface-600" />
        </div>

        {/* Title */}
        <h1 className="text-2xl font-bold text-surface-900 mb-2">Module Not Enabled</h1>

        {/* Module Name */}
        {moduleDefinition && <p className="text-lg text-brand-400 mb-4">{moduleDefinition.name}</p>}

        {/* Description */}
        <p className="text-surface-600 mb-6">
          {moduleDefinition
            ? `The ${moduleDefinition.name} module is not enabled for your organization. ${moduleDefinition.description}`
            : 'This feature is not available in your current configuration.'}
        </p>

        {/* How to Enable */}
        <div className="bg-white/50 rounded-lg p-4 mb-6 text-left">
          <h3 className="text-sm font-semibold text-surface-800 mb-2 flex items-center gap-2">
            <Cog6ToothIcon className="w-4 h-4" />
            How to Enable This Module
          </h3>
          <div className="text-sm text-surface-600 space-y-2">
            <p>
              To enable this module, an administrator needs to update the environment configuration:
            </p>
            {moduleDefinition && (
              <code className="block bg-white px-3 py-2 rounded text-xs text-green-600 font-mono">
                {moduleDefinition.envVar}=true
              </code>
            )}
            <p className="text-surface-500 text-xs">
              After updating, restart the application for changes to take effect.
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button variant="secondary" onClick={() => navigate(-1)}>
            <ArrowLeftIcon className="w-4 h-4 mr-2" />
            Go Back
          </Button>
          <Button onClick={() => navigate('/dashboard')}>Go to Dashboard</Button>
        </div>

        {/* Contact Admin */}
        <p className="text-surface-500 text-sm mt-6">
          Need access? Contact your organization administrator.
        </p>
      </div>
    </div>
  );
}

/**
 * Attempts to detect which module a path belongs to
 */
function detectModuleFromPath(path: string): ModuleId | null {
  for (const [moduleId, definition] of Object.entries(MODULE_DEFINITIONS)) {
    for (const route of definition.routes) {
      if (path === route || path.startsWith(route + '/')) {
        return moduleId as ModuleId;
      }
    }
  }
  return null;
}
