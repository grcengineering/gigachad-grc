import { Fragment, useState } from 'react';
import { Menu, Transition } from '@headlessui/react';
import {
  ChevronDownIcon,
  BuildingOfficeIcon,
  PlusIcon,
  Cog6ToothIcon,
  ChartBarIcon,
} from '@heroicons/react/24/outline';
import { useWorkspace, Workspace } from '@/contexts/WorkspaceContext';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

interface CreateWorkspaceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (data: { name: string; description?: string }) => Promise<void>;
}

function CreateWorkspaceModal({ isOpen, onClose, onCreate }: CreateWorkspaceModalProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setIsCreating(true);
    try {
      await onCreate({ name: name.trim(), description: description.trim() || undefined });
      setName('');
      setDescription('');
      onClose();
    } catch (error) {
      console.error('Failed to create workspace:', error);
    } finally {
      setIsCreating(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-surface-800 rounded-lg shadow-xl w-full max-w-md p-6">
        <h3 className="text-lg font-semibold text-foreground mb-4">Create New Workspace</h3>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                Workspace Name *
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Product A, Enterprise Edition"
                className="w-full px-3 py-2 bg-surface-700 border border-surface-600 rounded-lg text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-brand-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                Description (optional)
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Brief description of this workspace..."
                rows={2}
                className="w-full px-3 py-2 bg-surface-700 border border-surface-600 rounded-lg text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none"
              />
            </div>
          </div>
          <div className="mt-6 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!name.trim() || isCreating}
              className="px-4 py-2 text-sm bg-brand-600 text-white rounded-lg hover:bg-brand-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isCreating ? 'Creating...' : 'Create Workspace'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function WorkspaceSwitcher() {
  const {
    isMultiWorkspaceEnabled,
    workspaces,
    currentWorkspace,
    setCurrentWorkspace,
    createWorkspace,
    canManageWorkspaces,
  } = useWorkspace();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Don't render if multi-workspace is not enabled
  if (!isMultiWorkspaceEnabled) {
    return null;
  }

  const handleWorkspaceSelect = (workspace: Workspace) => {
    setCurrentWorkspace(workspace);
  };

  const handleCreateWorkspace = async (data: { name: string; description?: string }) => {
    const newWorkspace = await createWorkspace(data);
    setCurrentWorkspace(newWorkspace);
  };

  const activeWorkspaces = workspaces.filter((w) => w.status === 'active');

  return (
    <>
      <Menu as="div" className="relative">
        <Menu.Button className="flex items-center gap-2 px-3 py-2 rounded-lg bg-surface-800 hover:bg-surface-700 border border-surface-600 transition-colors text-sm text-foreground">
          <BuildingOfficeIcon className="w-4 h-4 text-surface-700" />
          <span className="font-medium max-w-[160px] truncate">
            {currentWorkspace?.name || 'Select Workspace'}
          </span>
          <ChevronDownIcon className="w-4 h-4 text-surface-700" />
        </Menu.Button>

        <Transition
          as={Fragment}
          enter="transition ease-out duration-100"
          enterFrom="transform opacity-0 scale-95"
          enterTo="transform opacity-100 scale-100"
          leave="transition ease-in duration-75"
          leaveFrom="transform opacity-100 scale-100"
          leaveTo="transform opacity-0 scale-95"
        >
          <Menu.Items className="absolute left-0 mt-2 w-64 rounded-lg bg-surface-800 border border-surface-700 shadow-lg z-50 py-1 focus:outline-none">
            {/* Workspace List */}
            <div className="px-2 py-1">
              <p className="text-xs text-muted-foreground uppercase tracking-wider px-2 py-1">
                Workspaces
              </p>
            </div>

            <div className="max-h-60 overflow-y-auto">
              {activeWorkspaces.map((workspace) => (
                <Menu.Item key={workspace.id}>
                  {({ active }) => (
                    <button
                      onClick={() => handleWorkspaceSelect(workspace)}
                      className={`w-full text-left px-4 py-2 text-sm flex items-center gap-2 ${
                        active ? 'bg-surface-700' : ''
                      } ${
                        currentWorkspace?.id === workspace.id ? 'text-brand-400' : 'text-foreground'
                      }`}
                    >
                      <BuildingOfficeIcon className="w-4 h-4 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="truncate font-medium">{workspace.name}</p>
                        {workspace.description && (
                          <p className="text-xs text-muted-foreground truncate">
                            {workspace.description}
                          </p>
                        )}
                      </div>
                      {currentWorkspace?.id === workspace.id && (
                        <span className="text-xs bg-brand-600/20 text-brand-400 px-1.5 py-0.5 rounded">
                          Active
                        </span>
                      )}
                    </button>
                  )}
                </Menu.Item>
              ))}
            </div>

            {/* Actions */}
            <div className="border-t border-surface-700 mt-1 pt-1">
              {/* View All Workspaces (Admin) */}
              {user?.role === 'admin' && (
                <Menu.Item>
                  {({ active }) => (
                    <button
                      onClick={() => navigate('/settings/workspaces')}
                      className={`w-full text-left px-4 py-2 text-sm flex items-center gap-2 ${
                        active ? 'bg-surface-700' : ''
                      } text-muted-foreground hover:text-foreground`}
                    >
                      <ChartBarIcon className="w-4 h-4" />
                      <span>View All Workspaces</span>
                    </button>
                  )}
                </Menu.Item>
              )}

              {/* Workspace Settings */}
              {currentWorkspace && canManageWorkspaces && (
                <Menu.Item>
                  {({ active }) => (
                    <button
                      onClick={() => navigate(`/settings/workspaces/${currentWorkspace.id}`)}
                      className={`w-full text-left px-4 py-2 text-sm flex items-center gap-2 ${
                        active ? 'bg-surface-700' : ''
                      } text-muted-foreground hover:text-foreground`}
                    >
                      <Cog6ToothIcon className="w-4 h-4" />
                      <span>Workspace Settings</span>
                    </button>
                  )}
                </Menu.Item>
              )}

              {/* Create New Workspace (Admin only) */}
              {canManageWorkspaces && (
                <Menu.Item>
                  {({ active }) => (
                    <button
                      onClick={() => setShowCreateModal(true)}
                      className={`w-full text-left px-4 py-2 text-sm flex items-center gap-2 ${
                        active ? 'bg-surface-700' : ''
                      } text-brand-400 hover:text-brand-300`}
                    >
                      <PlusIcon className="w-4 h-4" />
                      <span>Create New Workspace</span>
                    </button>
                  )}
                </Menu.Item>
              )}
            </div>
          </Menu.Items>
        </Transition>
      </Menu>

      <CreateWorkspaceModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onCreate={handleCreateWorkspace}
      />
    </>
  );
}

export default WorkspaceSwitcher;
