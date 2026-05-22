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

import { Textarea } from '@/components/ui/Textarea';
import { Input } from '@/components/ui/Input';
import { Dialog } from '@/components/ui/Dialog';
import { Button } from '@/components/ui/Button';

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

  return (
    <Dialog
      open={isOpen}
      onClose={onClose}
      title="Create New Workspace"
      size="md"
      footer={
        <div className="flex justify-end gap-3">
          <Button variant="ghost" onClick={onClose} disabled={isCreating}>
            Cancel
          </Button>
          <Button
            type="submit"
            form="create-workspace-form"
            disabled={!name.trim() || isCreating}
            isLoading={isCreating}
          >
            Create Workspace
          </Button>
        </div>
      }
    >
      <form id="create-workspace-form" onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-surface-800 mb-1">
            Workspace Name *
          </label>
          <Input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g., Product A, Enterprise Edition"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-surface-800 mb-1">
            Description (optional)
          </label>
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Brief description of this workspace..."
            rows={2}
          />
        </div>
      </form>
    </Dialog>
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
        <Menu.Button className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white hover:bg-surface-200 border border-surface-300 transition-colors text-sm text-foreground dark:bg-surface-900">
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
          <Menu.Items className="absolute left-0 mt-2 w-64 rounded-lg bg-white border border-surface-200 shadow-lg z-50 py-1 focus:outline-none dark:bg-surface-900">
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
                        active ? 'bg-surface-200' : ''
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
            <div className="border-t border-surface-200 mt-1 pt-1">
              {/* View All Workspaces (Admin) */}
              {user?.role === 'admin' && (
                <Menu.Item>
                  {({ active }) => (
                    <button
                      onClick={() => navigate('/settings/workspaces')}
                      className={`w-full text-left px-4 py-2 text-sm flex items-center gap-2 ${
                        active ? 'bg-surface-200' : ''
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
                        active ? 'bg-surface-200' : ''
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
                        active ? 'bg-surface-200' : ''
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
