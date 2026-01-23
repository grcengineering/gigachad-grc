import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeftIcon, 
  PencilIcon, 
  TrashIcon,
  CalendarDaysIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  SparklesIcon,
  DocumentTextIcon,
  ShieldExclamationIcon,
} from '@heroicons/react/24/outline';
import { vendorsApi, tprmConfigApi, TprmFeatureSettings } from '../lib/api';
import { Vendor } from '../lib/apiTypes';
import { Button } from '@/components/Button';
import { SkeletonDetailHeader, SkeletonDetailSection } from '@/components/Skeleton';
import { ConfirmModal } from '@/components/Modal';
import { SOC2AnalysisPanel } from '@/components/vendor/SOC2AnalysisPanel';
import { VendorRiskAssessmentWizard } from '@/components/vendor/VendorRiskAssessmentWizard';
import { VendorRiskAssessmentPanel } from '@/components/vendor/VendorRiskAssessmentPanel';
import { VendorSecurityScanPanel } from '@/components/vendor/VendorSecurityScanPanel';
import toast from 'react-hot-toast';
import clsx from 'clsx';

// Review frequency labels
const FREQUENCY_LABELS: Record<string, string> = {
  monthly: 'Monthly',
  quarterly: 'Quarterly',
  semi_annual: 'Semi-Annual',
  annual: 'Annual',
  biennial: 'Bi-Annual',
};

// Tier labels
const TIER_LABELS: Record<string, string> = {
  tier_1: 'Tier 1 (Critical)',
  tier_2: 'Tier 2 (High)',
  tier_3: 'Tier 3 (Medium)',
  tier_4: 'Tier 4 (Low)',
};

// Default feature settings (all enabled)
const DEFAULT_FEATURE_SETTINGS: TprmFeatureSettings = {
  enableSecurityScanning: true,
  enableRiskAssessmentWizard: true,
  enableSubdomainSpider: true,
  enableVendorPortal: true,
  enableContractManagement: true,
  enableQuestionnaireAutomation: true,
};

export default function VendorDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [vendor, setVendor] = useState<Vendor | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showRiskAssessment, setShowRiskAssessment] = useState(false);
  const [featureSettings, setFeatureSettings] = useState<TprmFeatureSettings>(DEFAULT_FEATURE_SETTINGS);

  // Fetch TPRM configuration for feature settings
  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const response = await tprmConfigApi.get();
        if (response.data?.featureSettings) {
          setFeatureSettings(response.data.featureSettings);
        }
      } catch (err) {
        // Use defaults if config fetch fails
        console.warn('Failed to fetch TPRM config, using defaults');
      }
    };
    fetchConfig();
  }, []);

  useEffect(() => {
    if (id && id !== 'new') {
      fetchVendor();
    } else {
      setLoading(false);
      setEditing(true);
    }
  }, [id]);

  const fetchVendor = async () => {
    try {
      const response = await vendorsApi.get(id!);
      setVendor(response.data);
    } catch (error) {
      console.error('Error fetching vendor:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (formData: Partial<Vendor>) => {
    try {
      const response = id === 'new'
        ? await vendorsApi.create(formData as any)
        : await vendorsApi.update(id!, formData as any);

      const data = response.data;
      if (id === 'new') {
        toast.success('Vendor created successfully');
        navigate(`/vendors/${data.id}`);
      } else {
        toast.success('Vendor updated successfully');
        setVendor(data);
        setEditing(false);
      }
    } catch (error) {
      console.error('Error saving vendor:', error);
      toast.error('Failed to save vendor');
    }
  };

  const handleDelete = async () => {
    try {
      await vendorsApi.delete(id!);
      toast.success('Vendor deleted successfully');
      navigate('/vendors');
    } catch (error) {
      console.error('Error deleting vendor:', error);
      toast.error('Failed to delete vendor');
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <SkeletonDetailHeader />
        <SkeletonDetailSection title />
        <SkeletonDetailSection title />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/vendors')}
            className="p-2 text-surface-400 hover:text-surface-100 hover:bg-surface-800 rounded-lg transition-colors"
          >
            <ArrowLeftIcon className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-3xl font-bold text-surface-100">
              {id === 'new' ? 'New Vendor' : vendor?.name || 'Vendor Details'}
            </h1>
            {vendor?.vendorId && (
              <p className="mt-1 text-surface-400">{vendor.vendorId}</p>
            )}
          </div>
        </div>

        {id !== 'new' && (
          <div className="flex items-center gap-2">
            {featureSettings.enableRiskAssessmentWizard !== false && (
              <Button
                variant="outline"
                onClick={() => setShowRiskAssessment(true)}
                leftIcon={<ShieldExclamationIcon className="w-5 h-5" />}
              >
                Risk Assessment
              </Button>
            )}
            <Button
              variant="outline"
              onClick={() => setEditing(!editing)}
              leftIcon={<PencilIcon className="w-5 h-5" />}
            >
              {editing ? 'Cancel' : 'Edit'}
            </Button>
            <Button
              variant="danger"
              onClick={() => setShowDeleteConfirm(true)}
              leftIcon={<TrashIcon className="w-5 h-5" />}
            >
              Delete
            </Button>
          </div>
        )}
      </div>

      {/* Form */}
      {editing ? (
        <VendorForm
          vendor={vendor}
          onSave={handleSave}
          onCancel={() => id === 'new' ? navigate('/vendors') : setEditing(false)}
        />
      ) : (
        <VendorView 
          vendor={vendor!} 
          onRefresh={fetchVendor} 
          featureSettings={featureSettings} 
          onStartRiskAssessment={() => setShowRiskAssessment(true)}
        />
      )}

      {/* Risk Assessment Wizard Modal */}
      {showRiskAssessment && vendor && (
        <VendorRiskAssessmentWizard
          vendorId={vendor.id}
          vendorName={vendor.name}
          onClose={() => setShowRiskAssessment(false)}
          onComplete={(result) => {
            setShowRiskAssessment(false);
            toast.success(`Risk assessment complete: ${result.riskLevel} risk`);
            fetchVendor();
          }}
        />
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={handleDelete}
        title="Delete Vendor"
        message={`Are you sure you want to delete "${vendor?.name}"? This action cannot be undone.`}
        confirmText="Delete"
        confirmVariant="danger"
      />
    </div>
  );
}

function VendorForm({
  vendor,
  onSave,
  onCancel
}: {
  vendor: Vendor | null;
  onSave: (data: Partial<Vendor>) => void;
  onCancel: () => void;
}) {
  const [formData, setFormData] = useState({
    organizationId: vendor?.organizationId || localStorage.getItem('organizationId') || '',
    vendorId: vendor?.vendorId || `VND-${Date.now()}`,
    name: vendor?.name || '',
    legalName: vendor?.legalName || '',
    category: vendor?.category || 'software_vendor',
    tier: vendor?.tier || 'tier_3',
    status: vendor?.status || 'active',
    description: vendor?.description || '',
    website: vendor?.website || '',
    primaryContact: vendor?.primaryContact || '',
    primaryContactEmail: vendor?.primaryContactEmail || '',
    primaryContactPhone: vendor?.primaryContactPhone || '',
    notes: vendor?.notes || '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="bg-surface-900 border border-surface-800 rounded-lg p-6 space-y-6">
        {/* Basic Information */}
        <div>
          <h3 className="text-lg font-medium text-surface-100 mb-4">Basic Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-surface-300 mb-1">
                Vendor Name *
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 bg-surface-800 border border-surface-700 rounded-lg text-surface-100 focus:outline-none focus:border-brand-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-surface-300 mb-1">
                Legal Name
              </label>
              <input
                type="text"
                value={formData.legalName}
                onChange={(e) => setFormData({ ...formData, legalName: e.target.value })}
                className="w-full px-3 py-2 bg-surface-800 border border-surface-700 rounded-lg text-surface-100 focus:outline-none focus:border-brand-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-surface-300 mb-1">
                Category *
              </label>
              <select
                required
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="w-full px-3 py-2 bg-surface-800 border border-surface-700 rounded-lg text-surface-100 focus:outline-none focus:border-brand-500"
              >
                <option value="software_vendor">Software Vendor</option>
                <option value="cloud_provider">Cloud Provider</option>
                <option value="professional_services">Professional Services</option>
                <option value="hardware_vendor">Hardware Vendor</option>
                <option value="consultant">Consultant</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-surface-300 mb-1">
                Tier *
              </label>
              <select
                required
                value={formData.tier}
                onChange={(e) => setFormData({ ...formData, tier: e.target.value })}
                className="w-full px-3 py-2 bg-surface-800 border border-surface-700 rounded-lg text-surface-100 focus:outline-none focus:border-brand-500"
              >
                <option value="tier_1">Tier 1 (Critical)</option>
                <option value="tier_2">Tier 2 (High)</option>
                <option value="tier_3">Tier 3 (Medium)</option>
                <option value="tier_4">Tier 4 (Low)</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-surface-300 mb-1">
                Status *
              </label>
              <select
                required
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                className="w-full px-3 py-2 bg-surface-800 border border-surface-700 rounded-lg text-surface-100 focus:outline-none focus:border-brand-500"
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="pending_onboarding">Pending Onboarding</option>
                <option value="offboarding">Offboarding</option>
                <option value="terminated">Terminated</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-surface-300 mb-1">
                Website
              </label>
              <input
                type="url"
                value={formData.website}
                onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                className="w-full px-3 py-2 bg-surface-800 border border-surface-700 rounded-lg text-surface-100 focus:outline-none focus:border-brand-500"
              />
            </div>
          </div>
        </div>

        {/* Contact Information */}
        <div>
          <h3 className="text-lg font-medium text-surface-100 mb-4">Primary Contact</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-surface-300 mb-1">
                Contact Name
              </label>
              <input
                type="text"
                value={formData.primaryContact}
                onChange={(e) => setFormData({ ...formData, primaryContact: e.target.value })}
                className="w-full px-3 py-2 bg-surface-800 border border-surface-700 rounded-lg text-surface-100 focus:outline-none focus:border-brand-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-surface-300 mb-1">
                Email
              </label>
              <input
                type="email"
                value={formData.primaryContactEmail}
                onChange={(e) => setFormData({ ...formData, primaryContactEmail: e.target.value })}
                className="w-full px-3 py-2 bg-surface-800 border border-surface-700 rounded-lg text-surface-100 focus:outline-none focus:border-brand-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-surface-300 mb-1">
                Phone
              </label>
              <input
                type="tel"
                value={formData.primaryContactPhone}
                onChange={(e) => setFormData({ ...formData, primaryContactPhone: e.target.value })}
                className="w-full px-3 py-2 bg-surface-800 border border-surface-700 rounded-lg text-surface-100 focus:outline-none focus:border-brand-500"
              />
            </div>
          </div>
        </div>

        {/* Description and Notes */}
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-surface-300 mb-1">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
              className="w-full px-3 py-2 bg-surface-800 border border-surface-700 rounded-lg text-surface-100 focus:outline-none focus:border-brand-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-surface-300 mb-1">
              Notes
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={3}
              className="w-full px-3 py-2 bg-surface-800 border border-surface-700 rounded-lg text-surface-100 focus:outline-none focus:border-brand-500"
            />
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-end gap-3">
        <Button variant="secondary" type="button" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit">
          Save Vendor
        </Button>
      </div>
    </form>
  );
}

function VendorView({ vendor, onRefresh, featureSettings, onStartRiskAssessment }: { vendor: Vendor; onRefresh?: () => void; featureSettings: TprmFeatureSettings; onStartRiskAssessment: () => void }) {
  const [showSOC2Panel, setShowSOC2Panel] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState<{ id: string; title: string } | null>(null);

  // Calculate review status
  const extendedVendor = vendor as Vendor & {
    nextReviewDue?: string;
    lastReviewedAt?: string;
    reviewFrequency?: string;
    website?: string;
    documents?: Array<{ id: string; title: string; documentType: string }>;
  };

  const nextReviewDue = extendedVendor.nextReviewDue ? new Date(extendedVendor.nextReviewDue) : null;
  const isOverdue = nextReviewDue ? nextReviewDue < new Date() : false;
  const daysUntilReview = nextReviewDue
    ? Math.ceil((nextReviewDue.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : null;

  const handleAnalyzeDocument = (doc: { id: string; title: string }) => {
    setSelectedDocument(doc);
    setShowSOC2Panel(true);
  };

  return (
    <div className="space-y-6">
      {/* Review Status Banner */}
      {nextReviewDue && (
        <div className={clsx(
          'p-4 rounded-lg border flex items-center justify-between',
          isOverdue 
            ? 'bg-red-500/10 border-red-500/30' 
            : daysUntilReview !== null && daysUntilReview <= 30
              ? 'bg-yellow-500/10 border-yellow-500/30'
              : 'bg-surface-800 border-surface-700'
        )}>
          <div className="flex items-center gap-3">
            {isOverdue ? (
              <ExclamationTriangleIcon className="w-5 h-5 text-red-400" />
            ) : (
              <CalendarDaysIcon className={clsx(
                'w-5 h-5',
                daysUntilReview !== null && daysUntilReview <= 30 ? 'text-yellow-400' : 'text-surface-400'
              )} />
            )}
            <div>
              <p className={clsx(
                'font-medium',
                isOverdue ? 'text-red-400' : daysUntilReview !== null && daysUntilReview <= 30 ? 'text-yellow-400' : 'text-surface-200'
              )}>
                {isOverdue 
                  ? `Review Overdue by ${Math.abs(daysUntilReview!)} days`
                  : `Next Review Due: ${nextReviewDue.toLocaleDateString()}`
                }
              </p>
              <p className="text-sm text-surface-400">
                Review Frequency: {FREQUENCY_LABELS[extendedVendor.reviewFrequency || 'annual'] || 'Annual'}
                {extendedVendor.lastReviewedAt && (
                  <> • Last Reviewed: {new Date(extendedVendor.lastReviewedAt).toLocaleDateString()}</>
                )}
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            leftIcon={<CheckCircleIcon className="w-4 h-4" />}
            onClick={() => {
              vendorsApi.completeReview(vendor.id).then(() => {
                toast.success('Review marked as complete');
                window.location.reload();
              }).catch(() => {
                toast.error('Failed to complete review');
              });
            }}
          >
            Mark Review Complete
          </Button>
        </div>
      )}

      {/* Basic Information */}
      <div className="bg-surface-900 border border-surface-800 rounded-lg p-6">
        <h3 className="text-lg font-medium text-surface-100 mb-4">Basic Information</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <InfoField label="Vendor Name" value={vendor.name} />
          <InfoField label="Legal Name" value={vendor.legalName} />
          <InfoField label="Category" value={vendor.category.replace('_', ' ')} capitalize />
          <InfoField label="Tier" value={TIER_LABELS[vendor.tier] || vendor.tier} />
          <InfoField label="Status" value={vendor.status} capitalize />
          <InfoField label="Website" value={vendor.website} link />
          <InfoField label="Risk Score" value={vendor.inherentRiskScore} capitalize />
          <InfoField 
            label="Review Frequency" 
            value={FREQUENCY_LABELS[extendedVendor.reviewFrequency || 'annual']} 
          />
        </div>
      </div>

      {/* Contact Information */}
      {(vendor.primaryContact || vendor.primaryContactEmail || vendor.primaryContactPhone) && (
        <div className="bg-surface-900 border border-surface-800 rounded-lg p-6">
          <h3 className="text-lg font-medium text-surface-100 mb-4">Primary Contact</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <InfoField label="Name" value={vendor.primaryContact} />
            <InfoField label="Email" value={vendor.primaryContactEmail} />
            <InfoField label="Phone" value={vendor.primaryContactPhone} />
          </div>
        </div>
      )}

      {/* Documents Section with AI Analysis */}
      <div className="bg-surface-900 border border-surface-800 rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <DocumentTextIcon className="w-5 h-5 text-surface-400" />
            <h3 className="text-lg font-medium text-surface-100">Documents</h3>
          </div>
        </div>

        {extendedVendor.documents && extendedVendor.documents.length > 0 ? (
          <div className="space-y-3">
            {extendedVendor.documents.map((doc) => (
              <div 
                key={doc.id}
                className="flex items-center justify-between p-3 bg-surface-800/50 rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <DocumentTextIcon className="w-5 h-5 text-surface-400" />
                  <div>
                    <p className="text-sm font-medium text-surface-200">{doc.title}</p>
                    <p className="text-xs text-surface-400">{doc.documentType.replace('_', ' ')}</p>
                  </div>
                </div>
                {(doc.documentType.toLowerCase().includes('soc2') || 
                  doc.documentType.toLowerCase().includes('soc 2')) && (
                  <Button
                    variant="ghost"
                    size="sm"
                    leftIcon={<SparklesIcon className="w-4 h-4" />}
                    onClick={() => handleAnalyzeDocument(doc)}
                  >
                    Analyze with AI
                  </Button>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-6 text-surface-400">
            <DocumentTextIcon className="w-10 h-10 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No documents uploaded yet</p>
            <p className="text-xs mt-1">Upload SOC 2 reports for AI-powered analysis</p>
          </div>
        )}

        {/* Demo SOC 2 Analysis Section */}
        <div className="mt-4 pt-4 border-t border-surface-700">
          <div className="flex items-center gap-2 mb-3">
            <SparklesIcon className="w-5 h-5 text-purple-400" />
            <h4 className="font-medium text-surface-200">AI-Powered SOC 2 Analysis</h4>
          </div>
          <p className="text-sm text-surface-400 mb-3">
            Upload a SOC 2 Type II report to automatically extract exceptions, CUECs, 
            and control gaps using AI.
          </p>
          <Button
            variant="outline"
            size="sm"
            leftIcon={<SparklesIcon className="w-4 h-4" />}
            onClick={() => {
              setSelectedDocument({ id: 'demo', title: 'Demo SOC 2 Report' });
              setShowSOC2Panel(true);
            }}
          >
            Try Demo Analysis
          </Button>
        </div>
      </div>

      {/* SOC 2 Analysis Panel */}
      {showSOC2Panel && selectedDocument && (
        <SOC2AnalysisPanel
          vendorId={vendor.id}
          documentId={selectedDocument.id}
          documentTitle={selectedDocument.title}
          onAnalysisComplete={() => {
            toast.success('Analysis complete');
          }}
          onCreateAssessment={() => {
            toast.success('Assessment created from analysis');
            setShowSOC2Panel(false);
          }}
        />
      )}

      {/* Risk Assessment Panel - conditionally shown based on feature settings */}
      {featureSettings.enableRiskAssessmentWizard !== false && (
        <VendorRiskAssessmentPanel
          vendorId={vendor.id}
          vendorName={vendor.name}
          onStartAssessment={onStartRiskAssessment}
        />
      )}

      {/* Security Scan Panel - conditionally shown based on feature settings */}
      {featureSettings.enableSecurityScanning !== false && (
        <VendorSecurityScanPanel
          vendorId={vendor.id}
          vendorName={vendor.name}
          vendorWebsite={extendedVendor.website}
          onScanComplete={() => {
            toast.success('Security scan complete');
            onRefresh?.();
          }}
          showSubdomains={featureSettings.enableSubdomainSpider !== false}
        />
      )}

      {/* Description */}
      {vendor.description && (
        <div className="bg-surface-900 border border-surface-800 rounded-lg p-6">
          <h3 className="text-lg font-medium text-surface-100 mb-4">Description</h3>
          <p className="text-surface-300">{vendor.description}</p>
        </div>
      )}

      {/* Notes */}
      {vendor.notes && (
        <div className="bg-surface-900 border border-surface-800 rounded-lg p-6">
          <h3 className="text-lg font-medium text-surface-100 mb-4">Notes</h3>
          <p className="text-surface-300 whitespace-pre-wrap">{vendor.notes}</p>
        </div>
      )}
    </div>
  );
}

function InfoField({
  label,
  value,
  capitalize,
  link
}: {
  label: string;
  value?: string | number | null;
  capitalize?: boolean;
  link?: boolean;
}) {
  if (!value) return null;

  return (
    <div>
      <dt className="text-sm font-medium text-surface-400 mb-1">{label}</dt>
      <dd className={`text-sm text-surface-100 ${capitalize ? 'capitalize' : ''}`}>
        {link ? (
          <a
            href={value.toString()}
            target="_blank"
            rel="noopener noreferrer"
            className="text-brand-400 hover:text-brand-300"
          >
            {value}
          </a>
        ) : (
          value
        )}
      </dd>
    </div>
  );
}
