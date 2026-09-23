interface VendorRiskAssessorParams {
    vendor: {
        name: string;
        category?: string;
        services?: string[];
        dataAccess?: string[];
    };
    assessmentData?: {
        securityQuestionnaire?: Record<string, unknown>;
        certifications?: string[];
        previousIncidents?: string[];
    };
    riskAppetite?: 'low' | 'medium' | 'high';
}
interface VendorRiskAssessmentResult {
    assessedAt: string;
    vendorName: string;
    overallRiskScore: number;
    riskTier: 'critical' | 'high' | 'medium' | 'low';
    recommendation: 'approve' | 'approve_with_conditions' | 'reject' | 'further_review';
    riskCategories: RiskCategory[];
    strengthsAndWeaknesses: {
        strengths: string[];
        weaknesses: string[];
    };
    requiredControls: RequiredControl[];
    contractualRequirements: string[];
    monitoringRequirements: MonitoringRequirement[];
    dueDate: string;
    isMockMode?: boolean;
    mockModeReason?: string;
}
interface RiskCategory {
    category: string;
    score: number;
    findings: string[];
    concerns: string[];
}
interface RequiredControl {
    control: string;
    priority: 'required' | 'recommended' | 'optional';
    rationale: string;
}
interface MonitoringRequirement {
    activity: string;
    frequency: string;
    responsible: string;
}
export declare function assessVendorRisk(params: VendorRiskAssessorParams): Promise<VendorRiskAssessmentResult>;
export {};
//# sourceMappingURL=vendor-risk-assessor.d.ts.map