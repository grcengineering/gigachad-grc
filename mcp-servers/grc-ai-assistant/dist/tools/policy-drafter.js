import { aiClient } from './ai-client.js';
import { useExplicitDemoFallback } from '../demo-mode.js';
const policyTemplates = {
    information_security: {
        title: 'Information Security Policy',
        sections: [
            'Purpose',
            'Scope',
            'Policy Statement',
            'Roles and Responsibilities',
            'Security Principles',
            'Compliance',
            'Exceptions',
            'Enforcement',
            'Policy Review',
        ],
    },
    access_control: {
        title: 'Access Control Policy',
        sections: [
            'Purpose',
            'Scope',
            'Access Control Principles',
            'User Account Management',
            'Authentication Requirements',
            'Authorization',
            'Privileged Access',
            'Access Reviews',
            'Enforcement',
        ],
    },
    data_classification: {
        title: 'Data Classification Policy',
        sections: [
            'Purpose',
            'Scope',
            'Classification Levels',
            'Handling Requirements',
            'Labeling',
            'Data Lifecycle',
            'Roles and Responsibilities',
            'Enforcement',
        ],
    },
    incident_response: {
        title: 'Incident Response Policy',
        sections: [
            'Purpose',
            'Scope',
            'Incident Categories',
            'Incident Response Team',
            'Response Procedures',
            'Communication',
            'Evidence Handling',
            'Post-Incident Review',
            'Reporting',
        ],
    },
    acceptable_use: {
        title: 'Acceptable Use Policy',
        sections: [
            'Purpose',
            'Scope',
            'General Use',
            'Email Use',
            'Internet Use',
            'Software Use',
            'Mobile Devices',
            'Prohibited Activities',
            'Monitoring',
            'Enforcement',
        ],
    },
    password: {
        title: 'Password Policy',
        sections: [
            'Purpose',
            'Scope',
            'Password Requirements',
            'Password Changes',
            'Password Storage',
            'Multi-Factor Authentication',
            'Privileged Accounts',
            'Enforcement',
        ],
    },
    remote_work: {
        title: 'Remote Work Security Policy',
        sections: [
            'Purpose',
            'Scope',
            'Eligibility',
            'Security Requirements',
            'Network Security',
            'Physical Security',
            'Data Protection',
            'Equipment',
            'Reporting',
        ],
    },
    vendor_management: {
        title: 'Vendor Management Policy',
        sections: [
            'Purpose',
            'Scope',
            'Vendor Assessment',
            'Risk Classification',
            'Due Diligence',
            'Contractual Requirements',
            'Ongoing Monitoring',
            'Termination',
            'Enforcement',
        ],
    },
    data_retention: {
        title: 'Data Retention Policy',
        sections: [
            'Purpose',
            'Scope',
            'Retention Categories',
            'Retention Periods',
            'Legal Holds',
            'Disposal Requirements',
            'Roles and Responsibilities',
            'Enforcement',
        ],
    },
    privacy: {
        title: 'Privacy Policy',
        sections: [
            'Purpose',
            'Scope',
            'Personal Data Collection',
            'Use of Personal Data',
            'Data Subject Rights',
            'Data Protection',
            'Third-Party Sharing',
            'International Transfers',
            'Contact Information',
        ],
    },
};
export async function draftPolicy(params) {
    const { policyType, frameworks = ['SOC 2', 'ISO 27001'], organizationContext, format = 'markdown', } = params;
    const template = policyTemplates[policyType];
    const orgName = organizationContext?.name || '[Organization Name]';
    if (!aiClient.isConfigured()) {
        return useExplicitDemoFallback('AI service is not configured', () => generateMockPolicy(policyType, template, orgName, frameworks, format));
    }
    const systemPrompt = `You are a GRC policy expert. Draft a comprehensive ${template.title} for ${orgName}.
The policy should:
- Be professional and formal in tone
- Include all standard sections
- Align with compliance frameworks: ${frameworks.join(', ')}
- Be specific and actionable
${organizationContext?.industry ? `- Be tailored for the ${organizationContext.industry} industry` : ''}
${organizationContext?.specificRequirements?.length ? `- Address specific requirements: ${organizationContext.specificRequirements.join(', ')}` : ''}

Return the policy in ${format} format.`;
    try {
        const response = await aiClient.complete([
            { role: 'system', content: systemPrompt },
            {
                role: 'user',
                content: `Draft a ${template.title} with sections: ${template.sections.join(', ')}`,
            },
        ]);
        const sections = template.sections.map((title) => ({
            title,
            content: extractSection(response, title),
        }));
        return {
            policyType,
            generatedAt: new Date().toISOString(),
            format,
            content: response,
            sections,
            metadata: {
                version: '1.0',
                effectiveDate: new Date().toISOString().split('T')[0],
                reviewDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                owner: 'Information Security Manager',
                approver: 'CISO',
            },
            frameworkAlignment: frameworks.map((fw) => ({
                framework: fw,
                requirements: getFrameworkRequirements(policyType, fw),
            })),
        };
    }
    catch (error) {
        return useExplicitDemoFallback(`AI policy drafting failed: ${error instanceof Error ? error.message : String(error)}`, () => generateMockPolicy(policyType, template, orgName, frameworks, format));
    }
}
function extractSection(content, sectionTitle) {
    const regex = new RegExp(`##?\\s*${sectionTitle}[\\s\\S]*?(?=##|$)`, 'i');
    const match = content.match(regex);
    return match ? match[0].trim() : `Content for ${sectionTitle} section`;
}
function getFrameworkRequirements(policyType, framework) {
    const mappings = {
        'SOC 2': {
            information_security: ['CC1.1', 'CC1.2', 'CC5.1', 'CC5.3'],
            access_control: ['CC6.1', 'CC6.2', 'CC6.3', 'CC6.4'],
            data_classification: ['CC6.7', 'C1.1', 'C1.2'],
            incident_response: ['CC7.3', 'CC7.4', 'CC7.5'],
            acceptable_use: ['CC1.4', 'CC5.3'],
            password: ['CC6.1', 'CC6.2'],
            remote_work: ['CC6.6', 'CC6.7'],
            vendor_management: ['CC9.2'],
            data_retention: ['CC6.5', 'C1.2'],
            privacy: ['P1.1', 'P2.1', 'P3.1', 'P4.1'],
        },
        'ISO 27001': {
            information_security: ['A.5.1', 'A.5.2'],
            access_control: ['A.9.1', 'A.9.2', 'A.9.4'],
            data_classification: ['A.8.2', 'A.8.3'],
            incident_response: ['A.16.1'],
            acceptable_use: ['A.8.1'],
            password: ['A.9.4'],
            remote_work: ['A.6.2'],
            vendor_management: ['A.15.1', 'A.15.2'],
            data_retention: ['A.8.3'],
            privacy: ['A.18.1'],
        },
    };
    return mappings[framework]?.[policyType] || [];
}
function generateMockPolicy(policyType, template, orgName, frameworks, format) {
    const sections = template.sections.map((title) => ({
        title,
        content: generateSectionContent(title, policyType, orgName),
    }));
    const content = sections
        .map((s) => format === 'markdown'
        ? `## ${s.title}\n\n${s.content}`
        : `<h2>${s.title}</h2>\n<p>${s.content}</p>`)
        .join('\n\n');
    return {
        policyType,
        generatedAt: new Date().toISOString(),
        format,
        content: `# ${template.title}\n\n${content}`,
        sections,
        metadata: {
            version: '1.0',
            effectiveDate: new Date().toISOString().split('T')[0],
            reviewDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            owner: 'Information Security Manager',
            approver: 'CISO',
        },
        frameworkAlignment: frameworks.map((fw) => ({
            framework: fw,
            requirements: getFrameworkRequirements(policyType, fw),
        })),
    };
}
function generateSectionContent(sectionTitle, policyType, orgName) {
    const contentMap = {
        Purpose: `This policy establishes the requirements for ${policyType.replace(/_/g, ' ')} at ${orgName}. It defines the standards, procedures, and responsibilities to ensure the security and integrity of information assets.`,
        Scope: `This policy applies to all employees, contractors, consultants, and third parties who have access to ${orgName}'s information systems and data. It covers all information assets, including but not limited to electronic data, systems, networks, and physical facilities.`,
        'Policy Statement': `${orgName} is committed to maintaining the highest standards of ${policyType.replace(/_/g, ' ')}. All personnel must adhere to the requirements outlined in this policy to protect organizational assets and maintain compliance with applicable laws and regulations.`,
        'Roles and Responsibilities': `- **Executive Management**: Provides oversight and ensures adequate resources for implementation\n- **Information Security Team**: Develops, implements, and monitors security controls\n- **Department Managers**: Ensures team compliance with policy requirements\n- **All Users**: Adheres to policy requirements and reports violations`,
        Compliance: `All personnel must comply with this policy. Compliance will be monitored through regular audits, reviews, and assessments. The policy aligns with industry standards including SOC 2, ISO 27001, and applicable regulatory requirements.`,
        Enforcement: `Violations of this policy may result in disciplinary action, up to and including termination of employment or contract. Violations that result in criminal activity may be reported to appropriate law enforcement authorities.`,
        'Policy Review': `This policy will be reviewed at least annually or when significant changes occur to ensure it remains current and effective. The Information Security team is responsible for initiating and coordinating policy reviews.`,
    };
    return (contentMap[sectionTitle] ||
        `This section defines the ${sectionTitle.toLowerCase()} requirements for ${policyType.replace(/_/g, ' ')} at ${orgName}.`);
}
//# sourceMappingURL=policy-drafter.js.map