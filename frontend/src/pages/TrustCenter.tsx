import { useState, useEffect, useCallback } from 'react';
import { trustCenterApi } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import { Button, Input, Textarea, Dialog, Badge } from '@/components/ui';
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
} from '@heroicons/react/24/outline';

interface TrustCenterConfig {
  id: string;
  isEnabled: boolean;
  companyName: string;
  description?: string;
  logoUrl?: string;
  primaryColor?: string;
  securityEmail?: string;
  supportUrl?: string;
  showCertifications: boolean;
  showPolicies: boolean;
  showSecurityFeatures: boolean;
  showPrivacy: boolean;
  showIncidentResponse: boolean;
}

interface TrustCenterContent {
  id: string;
  organizationId: string;
  section: string;
  title: string;
  content: string;
  order: number;
  isPublished: boolean;
}

type SectionType = 'overview' | 'certifications' | 'controls' | 'policies' | 'updates' | 'contact';

export default function TrustCenter() {
  const { user } = useAuth();
  const [config, setConfig] = useState<TrustCenterConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeSection, setActiveSection] = useState<SectionType>('overview');
  const [contents, setContents] = useState<TrustCenterContent[]>([]);
  const [editingContent, setEditingContent] = useState<TrustCenterContent | null>(null);
  const [showContentModal, setShowContentModal] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  const organizationId = user?.organizationId || '';

  const fetchConfig = useCallback(async () => {
    try {
      const response = await trustCenterApi.getConfig({ organizationId });
      setConfig(response.data);
    } catch (error) {
      console.error('Error fetching trust center config:', error);
    } finally {
      setLoading(false);
    }
  }, [organizationId]);

  const fetchContents = useCallback(async () => {
    try {
      const response = await trustCenterApi.getContent({ organizationId });
      setContents(response.data);
    } catch (error) {
      console.error('Error fetching trust center contents:', error);
    }
  }, [organizationId]);

  useEffect(() => {
    fetchConfig();
    fetchContents();
  }, [fetchConfig, fetchContents]);

  const updateConfig = async (updates: Partial<TrustCenterConfig>) => {
    try {
      const response = await trustCenterApi.updateConfig(updates, { organizationId });
      setConfig(response.data);
    } catch (error) {
      console.error('Error updating trust center config:', error);
    }
  };

  const saveContent = async (content: Partial<TrustCenterContent>) => {
    try {
      const data = {
        organizationId,
        ...content,
      };

      if (editingContent) {
        await trustCenterApi.updateContent(editingContent.id, data, { organizationId });
      } else {
        await trustCenterApi.createContent(data, { organizationId });
      }

      fetchContents();
      setShowContentModal(false);
      setEditingContent(null);
    } catch (error) {
      console.error('Error saving content:', error);
    }
  };

  const deleteContent = async (id: string) => {
    if (!confirm('Are you sure you want to delete this content?')) return;

    try {
      await trustCenterApi.deleteContent(id, { organizationId });
      fetchContents();
    } catch (error) {
      console.error('Error deleting content:', error);
    }
  };

  const toggleContentPublish = async (content: TrustCenterContent) => {
    try {
      await trustCenterApi.updateContent(
        content.id,
        { isPublished: !content.isPublished },
        { organizationId }
      );
      fetchContents();
    } catch (error) {
      console.error('Error toggling publish status:', error);
    }
  };

  const sections = [
    {
      id: 'overview' as SectionType,
      name: 'Hero & Overview',
      icon: GlobeAltIcon,
      description: 'Main banner and company overview',
    },
    {
      id: 'certifications' as SectionType,
      name: 'Certifications & Compliance',
      icon: CheckBadgeIcon,
      description: 'Compliance frameworks and certifications',
    },
    {
      id: 'controls' as SectionType,
      name: 'Security Controls',
      icon: ShieldCheckIcon,
      description: 'Technical and operational security controls',
    },
    {
      id: 'policies' as SectionType,
      name: 'Policies & Documentation',
      icon: DocumentTextIcon,
      description: 'Security policies and documentation',
    },
    {
      id: 'updates' as SectionType,
      name: 'Security Updates',
      icon: NewspaperIcon,
      description: 'News and security updates',
    },
    {
      id: 'contact' as SectionType,
      name: 'Contact Information',
      icon: EnvelopeIcon,
      description: 'Security team contact details',
    },
  ];

  const getSectionContents = (section: SectionType) => {
    return contents.filter((c) => c.section === section).sort((a, b) => a.order - b.order);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-surface-600">Loading trust center configuration...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-surface-900">Trust Center</h1>
          <p className="mt-1 text-surface-600">
            Configure your public-facing security trust center
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="secondary"
            onClick={() => setShowPreview(true)}
            leftIcon={<EyeIcon className="w-5 h-5" />}
          >
            Preview
          </Button>
          {config?.isEnabled && (
            <a
              href={`/trust-center/public?organizationId=${organizationId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-4 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 transition-colors"
            >
              <GlobeAltIcon className="w-5 h-5" />
              View Live Page
            </a>
          )}
        </div>
      </div>

      {config && (
        <div className="space-y-6">
          {/* Enable/Disable & Basic Settings */}
          <div className="bg-white border border-surface-200 rounded-lg p-6 space-y-6">
            <div className="flex items-center justify-between pb-6 border-b border-surface-200">
              <div>
                <h3 className="text-lg font-medium text-surface-900">Trust Center Status</h3>
                <p className="text-sm text-surface-600">
                  Make your trust center publicly accessible
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.isEnabled}
                  onChange={(e) => updateConfig({ isEnabled: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-surface-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-brand-600"></div>
              </label>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-surface-600 mb-1">
                  Company Name
                </label>
                <Input
                  type="text"
                  value={config.companyName}
                  onChange={(e) => updateConfig({ companyName: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-surface-600 mb-1">
                  Primary Color
                </label>
                <Input
                  type="text"
                  value={config.primaryColor || ''}
                  onChange={(e) => updateConfig({ primaryColor: e.target.value })}
                  placeholder="#6366f1"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-surface-600 mb-1">Logo URL</label>
              <Input
                type="url"
                value={config.logoUrl || ''}
                onChange={(e) => updateConfig({ logoUrl: e.target.value })}
                placeholder="https://example.com/logo.png"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-surface-600 mb-1">
                Company Description
              </label>
              <Textarea
                value={config.description || ''}
                onChange={(e) => updateConfig({ description: e.target.value })}
                rows={3}
                placeholder="Describe your security posture and commitment to security..."
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-surface-600 mb-1">
                  Security Email
                </label>
                <Input
                  type="email"
                  value={config.securityEmail || ''}
                  onChange={(e) => updateConfig({ securityEmail: e.target.value })}
                  placeholder="security@company.com"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-surface-600 mb-1">
                  Support URL
                </label>
                <Input
                  type="url"
                  value={config.supportUrl || ''}
                  onChange={(e) => updateConfig({ supportUrl: e.target.value })}
                  placeholder="https://support.company.com"
                />
              </div>
            </div>
          </div>

          {/* Section Navigation */}
          <div className="bg-white border border-surface-200 rounded-lg overflow-hidden">
            <div className="border-b border-surface-200">
              <nav className="flex overflow-x-auto">
                {sections.map((section) => {
                  const Icon = section.icon;
                  return (
                    <button
                      key={section.id}
                      onClick={() => setActiveSection(section.id)}
                      className={`flex items-center gap-2 px-6 py-4 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                        activeSection === section.id
                          ? 'border-brand-500 text-brand-700 bg-surface-100/50'
                          : 'border-transparent text-surface-600 hover:text-surface-700 hover:bg-surface-100/30'
                      }`}
                    >
                      <Icon className="w-5 h-5" />
                      {section.name}
                    </button>
                  );
                })}
              </nav>
            </div>

            <div className="p-6">
              {/* Section Description */}
              <div className="mb-6">
                <p className="text-surface-600">
                  {sections.find((s) => s.id === activeSection)?.description}
                </p>
              </div>

              {/* Section Content */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-surface-900">
                    {activeSection === 'overview' && 'Hero Banner Content'}
                    {activeSection === 'certifications' && 'Certification Items'}
                    {activeSection === 'controls' && 'Security Control Items'}
                    {activeSection === 'policies' && 'Policy Documents'}
                    {activeSection === 'updates' && 'Security Updates & News'}
                    {activeSection === 'contact' && 'Contact Information'}
                  </h3>
                  <Button
                    onClick={() => {
                      setEditingContent(null);
                      setShowContentModal(true);
                    }}
                    leftIcon={<PlusIcon className="w-5 h-5" />}
                  >
                    Add Content
                  </Button>
                </div>

                {/* Content List */}
                <div className="space-y-3">
                  {getSectionContents(activeSection).length === 0 ? (
                    <div className="text-center py-12 bg-white rounded-lg border-2 border-dashed border-surface-200">
                      <p className="text-surface-600 mb-4">No content added yet</p>
                      <Button
                        onClick={() => {
                          setEditingContent(null);
                          setShowContentModal(true);
                        }}
                        leftIcon={<PlusIcon className="w-5 h-5" />}
                      >
                        Add First Item
                      </Button>
                    </div>
                  ) : (
                    getSectionContents(activeSection).map((content) => (
                      <div
                        key={content.id}
                        className="bg-white border border-surface-200 rounded-lg p-4"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <h4 className="text-surface-900 font-medium">{content.title}</h4>
                              {content.isPublished ? (
                                <Badge variant="success" capitalize={false}>
                                  <EyeIcon className="w-3 h-3" />
                                  Published
                                </Badge>
                              ) : (
                                <Badge variant="neutral" capitalize={false}>
                                  <EyeSlashIcon className="w-3 h-3" />
                                  Draft
                                </Badge>
                              )}
                            </div>
                            <p className="text-sm text-surface-600 line-clamp-2">
                              {content.content}
                            </p>
                          </div>
                          <div className="flex items-center gap-2 ml-4">
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={() => toggleContentPublish(content)}
                            >
                              {content.isPublished ? 'Unpublish' : 'Publish'}
                            </Button>
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={() => {
                                setEditingContent(content);
                                setShowContentModal(true);
                              }}
                            >
                              Edit
                            </Button>
                            <Button
                              variant="danger"
                              size="sm"
                              onClick={() => deleteContent(content.id)}
                            >
                              Delete
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

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
      {showPreview && (
        <PreviewModal config={config} contents={contents} onClose={() => setShowPreview(false)} />
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
    <Dialog
      open
      onClose={onClose}
      title={content ? 'Edit Content' : 'Add New Content'}
      size="lg"
      footer={
        <>
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" form="trust-center-content-form">
            {content ? 'Update' : 'Create'}
          </Button>
        </>
      }
    >
      <form id="trust-center-content-form" onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-surface-600 mb-1">Title</label>
          <Input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            placeholder="Enter title..."
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-surface-600 mb-1">Content</label>
          <Textarea
            value={contentText}
            onChange={(e) => setContentText(e.target.value)}
            required
            rows={6}
            placeholder="Enter content..."
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-surface-600 mb-1">Display Order</label>
            <Input
              type="number"
              value={order}
              onChange={(e) => setOrder(parseInt(e.target.value))}
            />
          </div>

          <div className="flex items-end">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={isPublished}
                onChange={(e) => setIsPublished(e.target.checked)}
                className="w-4 h-4 bg-surface-100 border-surface-300 rounded text-brand-600 focus:ring-brand-500"
              />
              <span className="text-sm text-surface-700">Publish immediately</span>
            </label>
          </div>
        </div>
      </form>
    </Dialog>
  );
}

interface PreviewModalProps {
  config: TrustCenterConfig | null;
  contents: TrustCenterContent[];
  onClose: () => void;
}

function PreviewModal({ config, contents, onClose }: PreviewModalProps) {
  if (!config) return null;

  const publishedContents = contents.filter((c) => c.isPublished);
  const getSectionContents = (section: string) => {
    return publishedContents.filter((c) => c.section === section).sort((a, b) => a.order - b.order);
  };

  const overviewContents = getSectionContents('overview');
  const certificationContents = getSectionContents('certifications');
  const controlContents = getSectionContents('controls');
  const policyContents = getSectionContents('policies');
  const updateContents = getSectionContents('updates');
  const contactContents = getSectionContents('contact');

  return (
    <Dialog open onClose={onClose} size="xl" className="max-w-6xl">
      <div className="relative max-h-[80vh] overflow-y-auto -mx-5 -my-4">
        {/* Preview Badge */}
        <div className="sticky top-0 left-0 right-0 bg-yellow-500 text-yellow-900 px-4 py-2 text-center font-semibold z-10">
          PREVIEW MODE - This is how your trust center will appear to visitors
        </div>

        {/* Trust Center Preview Content */}
        <div
          className="p-8"
          style={{ backgroundColor: '#ffffff', color: config.primaryColor || '#1f2937' }}
        >
          {/* Hero Section */}
          <div className="text-center mb-16">
            {config.logoUrl && (
              <img src={config.logoUrl} alt={config.companyName} className="h-16 mx-auto mb-6" />
            )}
            <h1
              className="text-5xl font-bold mb-4"
              style={{ color: config.primaryColor || '#1f2937' }}
            >
              {config.companyName} Trust Center
            </h1>
            {config.description && (
              <p className="text-xl text-surface-700 max-w-3xl mx-auto">{config.description}</p>
            )}
          </div>

          {/* Overview Section */}
          {overviewContents.length > 0 && (
            <section className="mb-12">
              <h2
                className="text-3xl font-bold mb-6"
                style={{ color: config.primaryColor || '#1f2937' }}
              >
                Overview
              </h2>
              <div className="grid grid-cols-1 gap-6">
                {overviewContents.map((content) => (
                  <div key={content.id} className="bg-surface-100 p-6 rounded-lg">
                    <h3 className="text-xl font-semibold mb-2">{content.title}</h3>
                    <p className="text-surface-800">{content.content}</p>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Certifications Section */}
          {certificationContents.length > 0 && (
            <section className="mb-12">
              <h2
                className="text-3xl font-bold mb-6"
                style={{ color: config.primaryColor || '#1f2937' }}
              >
                <CheckBadgeIcon className="w-8 h-8 inline mr-2" />
                Certifications & Compliance
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {certificationContents.map((content) => (
                  <div
                    key={content.id}
                    className="bg-white p-6 rounded-lg border-2"
                    style={{ borderColor: config.primaryColor || '#1f2937' }}
                  >
                    <h3 className="text-xl font-semibold mb-2">{content.title}</h3>
                    <p className="text-surface-800">{content.content}</p>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Security Controls Section */}
          {controlContents.length > 0 && (
            <section className="mb-12">
              <h2
                className="text-3xl font-bold mb-6"
                style={{ color: config.primaryColor || '#1f2937' }}
              >
                <ShieldCheckIcon className="w-8 h-8 inline mr-2" />
                Security Controls
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {controlContents.map((content) => (
                  <div key={content.id} className="bg-surface-100 p-6 rounded-lg">
                    <h3 className="text-xl font-semibold mb-2">{content.title}</h3>
                    <p className="text-surface-800">{content.content}</p>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Policies Section */}
          {policyContents.length > 0 && (
            <section className="mb-12">
              <h2
                className="text-3xl font-bold mb-6"
                style={{ color: config.primaryColor || '#1f2937' }}
              >
                <DocumentTextIcon className="w-8 h-8 inline mr-2" />
                Policies & Documentation
              </h2>
              <div className="grid grid-cols-1 gap-4">
                {policyContents.map((content) => (
                  <div key={content.id} className="bg-surface-100 p-6 rounded-lg">
                    <h3 className="text-xl font-semibold mb-2">{content.title}</h3>
                    <p className="text-surface-800">{content.content}</p>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Security Updates Section */}
          {updateContents.length > 0 && (
            <section className="mb-12">
              <h2
                className="text-3xl font-bold mb-6"
                style={{ color: config.primaryColor || '#1f2937' }}
              >
                <NewspaperIcon className="w-8 h-8 inline mr-2" />
                Security Updates
              </h2>
              <div className="grid grid-cols-1 gap-6">
                {updateContents.map((content) => (
                  <div
                    key={content.id}
                    className="bg-white p-6 rounded-lg border-l-4"
                    style={{ borderLeftColor: config.primaryColor || '#1f2937' }}
                  >
                    <h3 className="text-xl font-semibold mb-2">{content.title}</h3>
                    <p className="text-surface-800">{content.content}</p>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Contact Section */}
          {(contactContents.length > 0 || config.securityEmail || config.supportUrl) && (
            <section className="mb-12">
              <h2
                className="text-3xl font-bold mb-6"
                style={{ color: config.primaryColor || '#1f2937' }}
              >
                <EnvelopeIcon className="w-8 h-8 inline mr-2" />
                Contact Us
              </h2>
              <div className="bg-surface-100 p-8 rounded-lg">
                {contactContents.map((content) => (
                  <div key={content.id} className="mb-4">
                    <h3 className="text-xl font-semibold mb-2">{content.title}</h3>
                    <p className="text-surface-800">{content.content}</p>
                  </div>
                ))}
                {config.securityEmail && (
                  <div className="mt-4">
                    <span className="font-semibold">Security Email: </span>
                    <a
                      href={`mailto:${config.securityEmail}`}
                      className="text-blue-600 hover:underline"
                    >
                      {config.securityEmail}
                    </a>
                  </div>
                )}
                {config.supportUrl && (
                  <div className="mt-2">
                    <span className="font-semibold">Support: </span>
                    <a
                      href={config.supportUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline"
                    >
                      {config.supportUrl}
                    </a>
                  </div>
                )}
              </div>
            </section>
          )}

          {/* Empty State */}
          {publishedContents.length === 0 && (
            <div className="text-center py-16">
              <div className="text-surface-500 mb-4">
                <GlobeAltIcon className="w-16 h-16 mx-auto mb-4" />
              </div>
              <h3 className="text-2xl font-semibold text-surface-700 mb-2">No Published Content</h3>
              <p className="text-surface-600">
                Add and publish content sections to see them appear here.
              </p>
            </div>
          )}

          {/* Footer */}
          <footer className="text-center pt-8 mt-16 border-t border-surface-200">
            <p className="text-surface-600 text-sm">
              © {new Date().getFullYear()} {config.companyName}. All rights reserved.
            </p>
          </footer>
        </div>
      </div>
    </Dialog>
  );
}
