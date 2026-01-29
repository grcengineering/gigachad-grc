import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { trustCenterApi } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import { TrustCenterConfig, TrustCenterContent } from '../lib/apiTypes';
import toast from 'react-hot-toast';
import {
  GlobeAltIcon,
  ShieldCheckIcon,
  DocumentTextIcon,
  CheckBadgeIcon,
  NewspaperIcon,
  EnvelopeIcon,
  EyeIcon,
  EyeSlashIcon,
  PlusIcon,
  Cog6ToothIcon,
  ArrowTopRightOnSquareIcon,
} from '@heroicons/react/24/outline';

type SectionType = 'overview' | 'certifications' | 'controls' | 'policies' | 'updates' | 'contact';

export default function TrustCenter() {
  const { user, isLoading: authLoading } = useAuth();
  const [config, setConfig] = useState<TrustCenterConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeSection, setActiveSection] = useState<SectionType>('overview');
  const [contents, setContents] = useState<TrustCenterContent[]>([]);
  const [editingContent, setEditingContent] = useState<TrustCenterContent | null>(null);
  const [showContentModal, setShowContentModal] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  const organizationId = user?.organizationId || '';

  useEffect(() => {
    if (organizationId && !authLoading) {
      fetchConfig();
      fetchContents();
    }
  }, [organizationId, authLoading]);

  // Wait for auth to load before rendering
  if (authLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-surface-400">Loading...</div>
      </div>
    );
  }

  const fetchConfig = async () => {
    try {
      const response = await trustCenterApi.getConfig({ organizationId });
      setConfig(response.data);
    } catch (error) {
      console.error('Error fetching trust center config:', error);
      toast.error('Failed to load trust center config');
    } finally {
      setLoading(false);
    }
  };

  const fetchContents = async () => {
    try {
      const response = await trustCenterApi.getContent({ organizationId });
      setContents(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      console.error('Error fetching trust center contents:', error);
      toast.error('Failed to load trust center contents');
    }
  };

  const saveContent = async (content: Partial<TrustCenterContent>) => {
    try {
      const data = {
        organizationId,
        ...content,
      };

      if (editingContent) {
        await trustCenterApi.updateContent(editingContent.id, data);
      } else {
        await trustCenterApi.createContent(data as any);
      }

      fetchContents();
      setShowContentModal(false);
      setEditingContent(null);
      toast.success('Content saved');
    } catch (error) {
      console.error('Error saving content:', error);
      toast.error('Failed to save content');
    }
  };

  const deleteContent = async (id: string) => {
    if (!confirm('Are you sure you want to delete this content?')) return;

    try {
      await trustCenterApi.deleteContent(id);
      fetchContents();
      toast.success('Content deleted');
    } catch (error) {
      console.error('Error deleting content:', error);
      toast.error('Failed to delete content');
    }
  };

  const toggleContentPublish = async (content: TrustCenterContent) => {
    try {
      await trustCenterApi.updateContent(content.id, { isPublished: !content.isPublished });
      fetchContents();
      toast.success(`Content ${content.isPublished ? 'unpublished' : 'published'}`);
    } catch (error) {
      console.error('Error toggling publish status:', error);
      toast.error('Failed to update publish status');
    }
  };

  const sections = [
    { id: 'overview' as SectionType, name: 'Overview', icon: GlobeAltIcon, description: 'Main banner and company overview' },
    { id: 'certifications' as SectionType, name: 'Certifications', icon: CheckBadgeIcon, description: 'Compliance frameworks and certifications' },
    { id: 'controls' as SectionType, name: 'Security Controls', icon: ShieldCheckIcon, description: 'Technical and operational security controls' },
    { id: 'policies' as SectionType, name: 'Policies', icon: DocumentTextIcon, description: 'Security policies and documentation' },
    { id: 'updates' as SectionType, name: 'Updates', icon: NewspaperIcon, description: 'News and security updates' },
    { id: 'contact' as SectionType, name: 'Contact', icon: EnvelopeIcon, description: 'Security team contact details' },
  ];

  const getSectionContents = (section: SectionType) => {
    return contents.filter(c => c.section === section).sort((a, b) => a.order - b.order);
  };

  const publishedCount = contents.filter(c => c.isPublished).length;
  const draftCount = contents.filter(c => !c.isPublished).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500 dark:text-surface-400">Loading trust center...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-800 dark:text-surface-100">Trust Center Content</h1>
          <p className="mt-1 text-gray-500 dark:text-surface-400">
            Manage the content displayed on your public trust center
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            to="/trust-center/settings"
            className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-surface-800 text-gray-700 dark:text-surface-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-100 dark:bg-surface-700 transition-colors"
          >
            <Cog6ToothIcon className="w-5 h-5" />
            Settings
          </Link>
          <button
            onClick={() => setShowPreview(true)}
            className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-surface-800 text-gray-700 dark:text-surface-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-100 dark:bg-surface-700 transition-colors"
          >
            <EyeIcon className="w-5 h-5" />
            Preview
          </button>
          {config?.isEnabled && (
            <a
              href={`/trust-center/public?organizationId=${organizationId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-4 py-2 bg-brand-600 text-gray-900 dark:text-white rounded-lg hover:bg-brand-700 transition-colors"
            >
              <ArrowTopRightOnSquareIcon className="w-5 h-5" />
              View Live
            </a>
          )}
        </div>
      </div>

      {/* Status Banner */}
      {!config?.isEnabled && (
        <div className="bg-amber-50 dark:bg-yellow-500/10 border border-amber-300 dark:border-yellow-500/30 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <EyeSlashIcon className="w-6 h-6 text-amber-600 dark:text-yellow-400" />
            <div>
              <p className="text-amber-700 dark:text-yellow-400 font-medium">Trust Center is not published</p>
              <p className="text-sm text-gray-600 dark:text-surface-400">
                Go to <Link to="/trust-center/settings" className="text-brand-600 dark:text-brand-400 hover:underline">Settings</Link> to enable your trust center
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-gray-50 dark:bg-surface-900 border border-gray-200 dark:border-surface-800 rounded-lg p-4">
          <div className="text-2xl font-bold text-gray-800 dark:text-surface-100">{contents.length}</div>
          <div className="text-sm text-gray-500 dark:text-surface-400">Total Content Items</div>
        </div>
        <div className="bg-gray-50 dark:bg-surface-900 border border-gray-200 dark:border-surface-800 rounded-lg p-4">
          <div className="text-2xl font-bold text-green-400">{publishedCount}</div>
          <div className="text-sm text-gray-500 dark:text-surface-400">Published</div>
        </div>
        <div className="bg-gray-50 dark:bg-surface-900 border border-gray-200 dark:border-surface-800 rounded-lg p-4">
          <div className="text-2xl font-bold text-amber-600 dark:text-yellow-400">{draftCount}</div>
          <div className="text-sm text-gray-500 dark:text-surface-400">Drafts</div>
        </div>
      </div>

      {/* Content Management */}
      <div className="bg-gray-50 dark:bg-surface-900 border border-gray-200 dark:border-surface-800 rounded-lg overflow-hidden">
        {/* Section Tabs */}
        <div className="border-b border-gray-200 dark:border-surface-800">
          <nav className="flex overflow-x-auto">
            {sections.map((section) => {
              const Icon = section.icon;
              const sectionContents = getSectionContents(section.id);
              const hasContent = sectionContents.length > 0;
              return (
                <button
                  key={section.id}
                  onClick={() => setActiveSection(section.id)}
                  className={`flex items-center gap-2 px-5 py-4 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                    activeSection === section.id
                      ? 'border-brand-500 text-brand-400 bg-white dark:bg-surface-800/50'
                      : 'border-transparent text-gray-500 dark:text-surface-400 hover:text-gray-600 dark:text-surface-300 hover:bg-white dark:bg-surface-800/30'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  {section.name}
                  {hasContent && (
                    <span className="px-1.5 py-0.5 text-xs bg-gray-100 dark:bg-surface-700 text-gray-600 dark:text-surface-300 rounded">
                      {sectionContents.length}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Section Content */}
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-800 dark:text-surface-100">
                {sections.find(s => s.id === activeSection)?.name}
              </h3>
              <p className="text-sm text-gray-500 dark:text-surface-400">
                {sections.find(s => s.id === activeSection)?.description}
              </p>
            </div>
            <button
              onClick={() => {
                setEditingContent(null);
                setShowContentModal(true);
              }}
              className="flex items-center gap-2 px-4 py-2 bg-brand-600 text-gray-900 dark:text-white rounded-lg hover:bg-brand-700 transition-colors"
            >
              <PlusIcon className="w-5 h-5" />
              Add Content
            </button>
          </div>

          {/* Content List */}
          <div className="space-y-3">
            {getSectionContents(activeSection).length === 0 ? (
              <div className="text-center py-16 bg-white dark:bg-surface-800/30 rounded-lg border-2 border-dashed border-gray-200 dark:border-surface-700">
                <div className="text-surface-500 mb-4">
                  {(() => {
                    const Icon = sections.find(s => s.id === activeSection)?.icon || GlobeAltIcon;
                    return <Icon className="w-12 h-12 mx-auto" />;
                  })()}
                </div>
                <p className="text-gray-500 dark:text-surface-400 mb-4">No content in this section yet</p>
                <button
                  onClick={() => {
                    setEditingContent(null);
                    setShowContentModal(true);
                  }}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-brand-600 text-gray-900 dark:text-white rounded-lg hover:bg-brand-700 transition-colors"
                >
                  <PlusIcon className="w-5 h-5" />
                  Add First Item
                </button>
              </div>
            ) : (
              getSectionContents(activeSection).map((content) => (
                <div
                  key={content.id}
                  className="bg-white dark:bg-surface-800 border border-gray-200 dark:border-surface-700 rounded-lg p-4"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <h4 className="text-gray-800 dark:text-surface-100 font-medium truncate">{content.title}</h4>
                        {content.isPublished ? (
                          <span className="flex items-center gap-1 px-2 py-0.5 text-xs bg-green-500/20 text-green-400 rounded shrink-0">
                            <EyeIcon className="w-3 h-3" />
                            Published
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 px-2 py-0.5 text-xs bg-surface-600 text-gray-500 dark:text-surface-400 rounded shrink-0">
                            <EyeSlashIcon className="w-3 h-3" />
                            Draft
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-500 dark:text-surface-400 line-clamp-2">{content.content}</p>
                    </div>
                    <div className="flex items-center gap-2 ml-4 shrink-0">
                      <button
                        onClick={() => toggleContentPublish(content)}
                        className={`px-3 py-1.5 text-xs rounded transition-colors ${
                          content.isPublished
                            ? 'bg-gray-100 dark:bg-surface-700 text-gray-700 dark:text-surface-200 hover:bg-gray-200 dark:hover:bg-surface-600'
                            : 'bg-green-500/20 text-green-400 hover:bg-green-500/30'
                        }`}
                      >
                        {content.isPublished ? 'Unpublish' : 'Publish'}
                      </button>
                      <button
                        onClick={() => {
                          setEditingContent(content);
                          setShowContentModal(true);
                        }}
                        className="px-3 py-1.5 text-xs bg-gray-100 dark:bg-surface-700 text-gray-700 dark:text-surface-200 rounded hover:bg-gray-200 dark:hover:bg-surface-600 transition-colors"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => deleteContent(content.id)}
                        className="px-3 py-1.5 text-xs bg-red-500/20 text-red-400 rounded hover:bg-red-500/30 transition-colors"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Content Modal */}
      {showContentModal && (
        <ContentModal
          section={activeSection}
          content={editingContent}
          onSave={saveContent}
          onClose={() => {
            setShowContentModal(false);
            setEditingContent(null);
          }}
        />
      )}

      {/* Preview Modal */}
      {showPreview && config && (
        <PreviewModal
          config={config}
          contents={contents}
          onClose={() => setShowPreview(false)}
        />
      )}
    </div>
  );
}

interface ContentModalProps {
  section: SectionType;
  content: TrustCenterContent | null;
  onSave: (content: Partial<TrustCenterContent>) => void;
  onClose: () => void;
}

function ContentModal({ section, content, onSave, onClose }: ContentModalProps) {
  const [title, setTitle] = useState(content?.title || '');
  const [contentText, setContentText] = useState(content?.content || '');
  const [order, setOrder] = useState(content?.order || 0);
  const [isPublished, setIsPublished] = useState(content?.isPublished || false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      section,
      title,
      content: contentText,
      order,
      isPublished,
    });
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-gray-50 dark:bg-surface-900 border border-gray-200 dark:border-surface-800 rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <h2 className="text-2xl font-bold text-gray-800 dark:text-surface-100 mb-4">
          {content ? 'Edit Content' : 'Add New Content'}
        </h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-500 dark:text-surface-400 mb-1">
              Title
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              className="w-full px-3 py-2 bg-white dark:bg-surface-800 border border-gray-200 dark:border-surface-700 rounded-lg text-gray-800 dark:text-surface-100 focus:outline-none focus:border-brand-500"
              placeholder="Enter title..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-500 dark:text-surface-400 mb-1">
              Content
            </label>
            <textarea
              value={contentText}
              onChange={(e) => setContentText(e.target.value)}
              required
              rows={8}
              className="w-full px-3 py-2 bg-white dark:bg-surface-800 border border-gray-200 dark:border-surface-700 rounded-lg text-gray-800 dark:text-surface-100 focus:outline-none focus:border-brand-500"
              placeholder="Enter content..."
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-500 dark:text-surface-400 mb-1">
                Display Order
              </label>
              <input
                type="number"
                value={order}
                onChange={(e) => setOrder(parseInt(e.target.value))}
                className="w-full px-3 py-2 bg-white dark:bg-surface-800 border border-gray-200 dark:border-surface-700 rounded-lg text-gray-800 dark:text-surface-100 focus:outline-none focus:border-brand-500"
              />
              <p className="text-xs text-surface-500 mt-1">Lower numbers appear first</p>
            </div>

            <div className="flex items-end pb-6">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isPublished}
                  onChange={(e) => setIsPublished(e.target.checked)}
                  className="w-4 h-4 bg-white dark:bg-surface-800 border-gray-200 dark:border-surface-700 rounded text-brand-600 focus:ring-brand-500"
                />
                <span className="text-sm text-gray-600 dark:text-surface-300">Publish immediately</span>
              </label>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-gray-200 dark:border-surface-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-white dark:bg-surface-800 text-gray-800 dark:text-surface-100 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-100 dark:bg-surface-700 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-brand-600 text-gray-900 dark:text-white rounded-lg hover:bg-brand-700 transition-colors"
            >
              {content ? 'Update' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

interface PreviewModalProps {
  config: TrustCenterConfig;
  contents: TrustCenterContent[];
  onClose: () => void;
}

function PreviewModal({ config, contents, onClose }: PreviewModalProps) {
  const publishedContents = contents.filter(c => c.isPublished);
  const getSectionContents = (section: string) => {
    return publishedContents.filter(c => c.section === section).sort((a, b) => a.order - b.order);
  };

  return (
    <div className="fixed inset-0 bg-black/75 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg w-full max-w-5xl max-h-[90vh] overflow-y-auto relative">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="sticky top-4 right-4 float-right z-10 p-2 bg-gray-800 text-gray-900 dark:text-white rounded-full hover:bg-gray-700 transition-colors m-4"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Preview Badge */}
        <div className="sticky top-0 left-0 right-0 bg-yellow-500 text-yellow-900 px-4 py-2 text-center font-semibold z-10">
          PREVIEW - This is how your trust center will appear to visitors
        </div>

        {/* Trust Center Preview */}
        <div className="p-8" style={{ color: '#1f2937' }}>
          {/* Hero */}
          <div className="text-center mb-12">
            {config.logoUrl && (
              <img src={config.logoUrl} alt={config.companyName} className="h-12 mx-auto mb-4" />
            )}
            <h1 className="text-4xl font-bold mb-3" style={{ color: config.primaryColor || '#6366f1' }}>
              {config.companyName} Trust Center
            </h1>
            {config.description && (
              <p className="text-lg text-gray-600 max-w-2xl mx-auto">{config.description}</p>
            )}
          </div>

          {/* Sections */}
          {['overview', 'certifications', 'controls', 'policies', 'updates', 'contact'].map(section => {
            const sectionContents = getSectionContents(section);
            if (sectionContents.length === 0) return null;

            const sectionTitles: Record<string, string> = {
              overview: 'Overview',
              certifications: 'Certifications & Compliance',
              controls: 'Security Controls',
              policies: 'Policies & Documentation',
              updates: 'Security Updates',
              contact: 'Contact Us',
            };

            return (
              <section key={section} className="mb-10">
                <h2 className="text-2xl font-bold mb-4" style={{ color: config.primaryColor || '#6366f1' }}>
                  {sectionTitles[section]}
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {sectionContents.map(content => (
                    <div key={content.id} className="bg-gray-50 p-5 rounded-lg">
                      <h3 className="text-lg font-semibold mb-2">{content.title}</h3>
                      <p className="text-gray-600">{content.content}</p>
                    </div>
                  ))}
                </div>
              </section>
            );
          })}

          {/* Empty State */}
          {publishedContents.length === 0 && (
            <div className="text-center py-16">
              <GlobeAltIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-500 mb-2">No Published Content</h3>
              <p className="text-gray-400">Add and publish content to see it here</p>
            </div>
          )}

          {/* Footer */}
          <footer className="text-center pt-8 mt-12 border-t border-gray-200">
            <p className="text-gray-400 text-sm">
              © {new Date().getFullYear()} {config.companyName}. All rights reserved.
            </p>
          </footer>
        </div>
      </div>
    </div>
  );
}
