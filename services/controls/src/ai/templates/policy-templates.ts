/**
 * Policy Template Library
 * 
 * Comprehensive policy templates for GRC compliance.
 * Used by the Mock AI Provider for testing without an API key.
 */

export interface PolicyTemplate {
  type: string;
  title: string;
  sections: PolicySection[];
  frameworkMappings: Record<string, string[]>;
  relatedPolicies: string[];
  suggestedReviewSchedule: string;
}

export interface PolicySection {
  title: string;
  content: string;
  order: number;
}

/**
 * Get framework-specific requirements text for a policy
 */
export function getFrameworkRequirements(frameworks: string[]): string {
  const frameworkText: string[] = [];

  if (frameworks.includes('SOC 2') || frameworks.includes('soc2')) {
    frameworkText.push('**SOC 2 Trust Services Criteria**: This policy addresses the Security, Availability, Processing Integrity, Confidentiality, and Privacy criteria as applicable.');
  }
  if (frameworks.includes('ISO 27001') || frameworks.includes('iso27001')) {
    frameworkText.push('**ISO 27001:2022**: This policy supports compliance with Annex A controls and the Information Security Management System (ISMS) requirements.');
  }
  if (frameworks.includes('HIPAA') || frameworks.includes('hipaa')) {
    frameworkText.push('**HIPAA**: This policy addresses the Security Rule and Privacy Rule requirements for protecting Protected Health Information (PHI).');
  }
  if (frameworks.includes('PCI DSS') || frameworks.includes('pci-dss')) {
    frameworkText.push('**PCI DSS 4.0.1**: This policy supports compliance with requirements for protecting cardholder data.');
  }
  if (frameworks.includes('GDPR') || frameworks.includes('gdpr')) {
    frameworkText.push('**GDPR**: This policy addresses requirements for processing personal data of EU residents.');
  }
  if (frameworks.includes('NIST CSF') || frameworks.includes('nist-csf')) {
    frameworkText.push('**NIST Cybersecurity Framework**: This policy aligns with the Identify, Protect, Detect, Respond, and Recover functions.');
  }
  if (frameworks.includes('HITRUST') || frameworks.includes('hitrust')) {
    frameworkText.push('**HITRUST CSF**: This policy supports compliance with the HITRUST Common Security Framework controls.');
  }

  return frameworkText.length > 0
    ? '\n\n## Framework Compliance\n\n' + frameworkText.join('\n\n')
    : '';
}

/**
 * Replace placeholders in template content
 */
export function replacePlaceholders(content: string, organizationName: string, industry?: string): string {
  let result = content.replace(/\[Organization Name\]/g, organizationName);
  result = result.replace(/\[ORGANIZATION\]/g, organizationName.toUpperCase());
  result = result.replace(/\[Industry\]/g, industry || 'Technology');
  result = result.replace(/\[Current Date\]/g, new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }));
  result = result.replace(/\[Review Date\]/g, new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }));
  return result;
}

// ============================================
// Policy Templates
// ============================================

export const POLICY_TEMPLATES: PolicyTemplate[] = [
  // Information Security Policy
  {
    type: 'Information Security Policy',
    title: 'Information Security Policy',
    suggestedReviewSchedule: 'Annual review required, or upon significant organizational or regulatory changes',
    relatedPolicies: ['Access Control Policy', 'Data Protection Policy', 'Acceptable Use Policy', 'Incident Response Policy'],
    frameworkMappings: {
      'SOC 2': ['CC1.1', 'CC1.2', 'CC1.3', 'CC2.1', 'CC5.1'],
      'ISO 27001': ['A.5.1', 'A.5.2', 'A.5.3', 'A.5.4'],
      'NIST CSF': ['ID.GV-1', 'ID.GV-2', 'PR.IP-1'],
      'HIPAA': ['164.308(a)(1)', '164.308(a)(2)'],
      'PCI DSS': ['12.1', '12.1.1', '12.1.2'],
    },
    sections: [
      {
        order: 1,
        title: '1. Purpose',
        content: `The purpose of this Information Security Policy is to establish a comprehensive framework for protecting [Organization Name]'s information assets, systems, and data from unauthorized access, disclosure, modification, or destruction.

This policy defines the security requirements, responsibilities, and controls necessary to:
- Protect the confidentiality, integrity, and availability of information
- Ensure compliance with applicable laws, regulations, and contractual obligations
- Minimize the risk of security incidents and data breaches
- Establish a culture of security awareness throughout the organization`,
      },
      {
        order: 2,
        title: '2. Scope',
        content: `This policy applies to:
- All employees, contractors, consultants, and temporary workers of [Organization Name]
- All information systems, applications, and data owned or managed by [Organization Name]
- All third parties who access or process [Organization Name]'s information
- All locations where [Organization Name] conducts business operations

This policy covers all forms of information, including electronic data, paper documents, and verbal communications.`,
      },
      {
        order: 3,
        title: '3. Information Security Principles',
        content: `[Organization Name] adheres to the following core information security principles:

### 3.1 Confidentiality
Information shall be accessible only to those authorized to have access. Access controls, encryption, and data classification are used to protect sensitive information.

### 3.2 Integrity
Information shall be protected from unauthorized modification. Change management, audit trails, and validation controls ensure data accuracy and completeness.

### 3.3 Availability
Information and systems shall be available when needed by authorized users. Business continuity planning, redundancy, and backup procedures support system availability.

### 3.4 Defense in Depth
Multiple layers of security controls shall be implemented to protect against various threats and reduce single points of failure.

### 3.5 Least Privilege
Users shall be granted the minimum level of access required to perform their job functions.`,
      },
      {
        order: 4,
        title: '4. Roles and Responsibilities',
        content: `### 4.1 Executive Leadership
- Approve and champion the information security program
- Allocate appropriate resources for security initiatives
- Set the tone for security culture from the top

### 4.2 Chief Information Security Officer (CISO) / Security Team
- Develop and maintain security policies, standards, and procedures
- Conduct risk assessments and manage the security program
- Monitor security events and coordinate incident response
- Provide security awareness training and guidance

### 4.3 IT Department
- Implement and maintain security controls on systems and networks
- Manage access controls and user provisioning
- Perform system hardening and patch management
- Monitor systems for security vulnerabilities

### 4.4 Department Managers
- Ensure team compliance with security policies
- Identify and classify departmental information assets
- Report security incidents and concerns
- Support security training participation

### 4.5 All Employees
- Comply with all security policies and procedures
- Complete required security awareness training
- Report security incidents and suspicious activities
- Protect credentials and access to information systems`,
      },
      {
        order: 5,
        title: '5. Information Classification',
        content: `All information assets shall be classified according to their sensitivity and criticality:

### 5.1 Classification Levels

| Level | Description | Examples |
|-------|-------------|----------|
| **Public** | Information intended for public disclosure | Marketing materials, public website content |
| **Internal** | Information for internal use only | Internal memos, non-sensitive business data |
| **Confidential** | Sensitive business information requiring protection | Financial reports, strategic plans, customer lists |
| **Restricted** | Highly sensitive information with strict access controls | PII, PHI, payment card data, trade secrets |

### 5.2 Handling Requirements
Each classification level has specific handling, storage, transmission, and disposal requirements documented in the Data Classification Standard.`,
      },
      {
        order: 6,
        title: '6. Security Controls',
        content: `[Organization Name] implements the following categories of security controls:

### 6.1 Administrative Controls
- Security policies and procedures
- Background checks and screening
- Security awareness training
- Risk assessments and audits

### 6.2 Technical Controls
- Access control systems and authentication
- Encryption for data at rest and in transit
- Intrusion detection and prevention systems
- Security monitoring and logging
- Vulnerability management
- Endpoint protection

### 6.3 Physical Controls
- Facility access controls
- Visitor management
- Environmental controls
- Asset protection and disposal`,
      },
      {
        order: 7,
        title: '7. Incident Response',
        content: `All security incidents shall be reported and handled according to the Incident Response Policy. Key requirements include:

- **Immediate Reporting**: All suspected or confirmed security incidents must be reported immediately to the security team
- **Containment**: Quick action to limit the impact of security incidents
- **Investigation**: Thorough investigation to determine root cause and scope
- **Recovery**: Restoration of affected systems and data
- **Lessons Learned**: Post-incident review to improve security controls`,
      },
      {
        order: 8,
        title: '8. Compliance and Enforcement',
        content: `### 8.1 Monitoring and Auditing
[Organization Name] reserves the right to monitor and audit information systems and user activities to ensure compliance with this policy.

### 8.2 Violations
Violations of this policy may result in disciplinary action, up to and including termination of employment or contract. Serious violations may be reported to law enforcement.

### 8.3 Exceptions
Exceptions to this policy require written approval from the CISO and must include compensating controls and an expiration date.`,
      },
      {
        order: 9,
        title: '9. Policy Review',
        content: `This policy shall be reviewed at least annually, or when significant changes occur to:
- The organization's business operations
- Technology infrastructure
- Regulatory requirements
- Threat landscape

All revisions must be approved by executive leadership and communicated to all personnel.`,
      },
    ],
  },

  // Access Control Policy
  {
    type: 'Access Control Policy',
    title: 'Access Control Policy',
    suggestedReviewSchedule: 'Annual review required',
    relatedPolicies: ['Information Security Policy', 'Password Policy', 'Remote Access Policy'],
    frameworkMappings: {
      'SOC 2': ['CC6.1', 'CC6.2', 'CC6.3'],
      'ISO 27001': ['A.5.15', 'A.5.16', 'A.5.17', 'A.5.18', 'A.8.2', 'A.8.3'],
      'NIST CSF': ['PR.AC-1', 'PR.AC-3', 'PR.AC-4', 'PR.AC-5'],
      'HIPAA': ['164.312(a)(1)', '164.312(d)'],
      'PCI DSS': ['7.1', '7.2', '7.3', '8.1', '8.2', '8.3'],
    },
    sections: [
      {
        order: 1,
        title: '1. Purpose',
        content: `This Access Control Policy establishes requirements for managing access to [Organization Name]'s information systems, applications, and data. The purpose is to ensure that:
- Access is granted based on business need and job responsibilities
- Access rights are properly authorized, implemented, and reviewed
- The principle of least privilege is enforced
- Access is promptly revoked when no longer required`,
      },
      {
        order: 2,
        title: '2. Scope',
        content: `This policy applies to:
- All employees, contractors, and third parties requiring access to [Organization Name] systems
- All information systems, applications, databases, and networks
- All types of access including physical, logical, remote, and privileged access
- All authentication mechanisms including passwords, tokens, and biometrics`,
      },
      {
        order: 3,
        title: '3. Access Control Principles',
        content: `### 3.1 Least Privilege
Users shall be granted the minimum access rights necessary to perform their job functions. Excessive permissions must not be granted.

### 3.2 Need-to-Know
Access to information shall be restricted to individuals who require it for legitimate business purposes.

### 3.3 Separation of Duties
Critical functions shall be divided among multiple individuals to reduce the risk of fraud or error.

### 3.4 Defense in Depth
Multiple layers of access controls shall be implemented to protect sensitive systems and data.`,
      },
      {
        order: 4,
        title: '4. User Account Management',
        content: `### 4.1 Account Provisioning
- All access requests must be submitted through the approved access request process
- Requests must be approved by the user's manager and system owner
- Access shall be granted within a defined SLA after approval

### 4.2 Account Review
- User access rights shall be reviewed quarterly
- Managers must certify the appropriateness of their team members' access
- Orphaned accounts must be investigated and remediated

### 4.3 Account Termination
- Access must be revoked within 24 hours of employment termination
- Access reviews must be conducted upon role changes
- Contractors' access must be reviewed upon contract expiration`,
      },
      {
        order: 5,
        title: '5. Authentication Requirements',
        content: `### 5.1 Password Requirements
- Minimum length: 12 characters
- Complexity: Mix of uppercase, lowercase, numbers, and special characters
- Password history: Cannot reuse last 12 passwords
- Maximum age: 90 days (or as required by specific systems)

### 5.2 Multi-Factor Authentication (MFA)
MFA is required for:
- All remote access
- Access to privileged accounts
- Access to systems containing sensitive data
- Cloud service administration

### 5.3 Session Management
- Sessions shall timeout after 15 minutes of inactivity
- Concurrent sessions shall be limited as appropriate
- Session tokens shall be securely generated and protected`,
      },
      {
        order: 6,
        title: '6. Privileged Access',
        content: `Privileged accounts require additional controls:

### 6.1 Requirements
- Privileged access shall be granted only when required for job function
- Privileged accounts must be separate from standard user accounts
- All privileged access must be logged and monitored

### 6.2 Controls
- Privileged access must use multi-factor authentication
- Privileged sessions should be recorded where technically feasible
- Privileged credentials should be stored in an approved password vault
- Just-in-time (JIT) access should be implemented where possible`,
      },
      {
        order: 7,
        title: '7. Remote Access',
        content: `### 7.1 Requirements
- All remote access must use approved VPN or secure access solutions
- Remote access requires multi-factor authentication
- Split tunneling is prohibited unless specifically approved

### 7.2 Endpoint Requirements
- Devices used for remote access must meet security requirements
- Endpoint protection software must be installed and current
- Device encryption must be enabled`,
      },
      {
        order: 8,
        title: '8. Monitoring and Logging',
        content: `### 8.1 Access Logging
- All access attempts (successful and failed) shall be logged
- Logs shall include user identity, timestamp, and action performed
- Logs shall be protected from unauthorized modification or deletion

### 8.2 Monitoring
- Access logs shall be reviewed regularly for anomalies
- Automated alerts shall be configured for suspicious activities
- Failed login attempts shall trigger account lockout after defined threshold`,
      },
    ],
  },

  // Acceptable Use Policy
  {
    type: 'Acceptable Use Policy',
    title: 'Acceptable Use Policy',
    suggestedReviewSchedule: 'Annual review required',
    relatedPolicies: ['Information Security Policy', 'Data Protection Policy', 'Email and Communications Policy'],
    frameworkMappings: {
      'SOC 2': ['CC1.4', 'CC2.2', 'CC6.1'],
      'ISO 27001': ['A.5.10', 'A.5.11', 'A.5.12'],
      'NIST CSF': ['PR.AT-1', 'PR.IP-11'],
      'HIPAA': ['164.310(b)', '164.312(a)(1)'],
      'PCI DSS': ['12.3', '12.3.1', '12.3.5'],
    },
    sections: [
      {
        order: 1,
        title: '1. Purpose',
        content: `This Acceptable Use Policy defines the acceptable use of [Organization Name]'s information technology resources. The purpose is to:
- Protect the organization's information assets and infrastructure
- Establish expectations for appropriate use of technology resources
- Minimize legal and security risks from improper use
- Ensure compliance with applicable laws and regulations`,
      },
      {
        order: 2,
        title: '2. Scope',
        content: `This policy applies to:
- All employees, contractors, consultants, and temporary workers
- All information technology resources owned or leased by [Organization Name]
- All use of organization systems, whether on-premises or remote
- Personal devices used to access organization resources (BYOD)`,
      },
      {
        order: 3,
        title: '3. Acceptable Use',
        content: `### 3.1 General Guidelines
- Technology resources are provided primarily for business purposes
- Limited personal use is permitted if it does not interfere with work duties
- All use must comply with applicable laws and organization policies
- Users must protect their credentials and not share accounts

### 3.2 Email and Communications
- Business communications should be professional and appropriate
- Sensitive information must be encrypted when transmitted externally
- Email disclaimers should be used for external communications
- Personal opinions should not be represented as organization positions`,
      },
      {
        order: 4,
        title: '4. Prohibited Activities',
        content: `The following activities are strictly prohibited:

### 4.1 Security Violations
- Attempting to bypass security controls or access unauthorized systems
- Sharing passwords or authentication credentials
- Installing unauthorized software or hardware
- Disabling security software or controls

### 4.2 Illegal Activities
- Accessing, storing, or distributing illegal content
- Violating copyright or intellectual property rights
- Engaging in harassment, discrimination, or threats
- Unauthorized disclosure of confidential information

### 4.3 Resource Misuse
- Using resources for personal financial gain or commercial purposes
- Excessive personal use that impacts productivity
- Cryptocurrency mining or other resource-intensive activities
- Using resources for political activities or gambling`,
      },
      {
        order: 5,
        title: '5. Data Protection',
        content: `### 5.1 Handling Requirements
- Sensitive data must be stored only in approved locations
- Data must be classified and handled according to its classification
- Portable media containing sensitive data must be encrypted
- Sensitive data must not be stored on personal devices without approval

### 5.2 Data Transmission
- Sensitive data must be encrypted during transmission
- Approved secure file transfer methods must be used
- Cloud storage services must be approved by IT Security`,
      },
      {
        order: 6,
        title: '6. Monitoring and Privacy',
        content: `### 6.1 Monitoring Notice
[Organization Name] reserves the right to monitor use of its technology resources without prior notice. Monitoring may include:
- Network traffic and internet usage
- Email and communications
- File access and transfers
- System and application usage

### 6.2 Privacy Expectations
Users should have no expectation of privacy when using organization technology resources. All activities may be logged, monitored, and reviewed.`,
      },
      {
        order: 7,
        title: '7. Compliance and Enforcement',
        content: `### 7.1 User Acknowledgment
All users must acknowledge this policy before receiving access to technology resources.

### 7.2 Violations
Violations may result in:
- Immediate revocation of access privileges
- Disciplinary action up to and including termination
- Civil or criminal legal action where applicable

### 7.3 Reporting
Users must report suspected policy violations to their manager or IT Security.`,
      },
    ],
  },

  // Data Protection Policy
  {
    type: 'Data Protection Policy',
    title: 'Data Protection and Privacy Policy',
    suggestedReviewSchedule: 'Annual review required, with updates for regulatory changes',
    relatedPolicies: ['Information Security Policy', 'Data Retention Policy', 'Privacy Policy', 'Incident Response Policy'],
    frameworkMappings: {
      'SOC 2': ['CC6.1', 'CC6.5', 'CC6.6', 'CC6.7', 'P1.1', 'P2.1', 'P3.1'],
      'ISO 27001': ['A.5.33', 'A.5.34', 'A.8.10', 'A.8.11', 'A.8.12'],
      'GDPR': ['Article 5', 'Article 6', 'Article 25', 'Article 32'],
      'HIPAA': ['164.502', '164.504', '164.514'],
      'PCI DSS': ['3.1', '3.2', '3.3', '3.4', '3.5'],
    },
    sections: [
      {
        order: 1,
        title: '1. Purpose',
        content: `This Data Protection Policy establishes requirements for protecting personal and sensitive data processed by [Organization Name]. The purpose is to:
- Ensure compliance with data protection laws and regulations
- Protect the privacy rights of individuals
- Establish controls for collecting, processing, and storing data
- Define data handling requirements throughout the data lifecycle`,
      },
      {
        order: 2,
        title: '2. Scope',
        content: `This policy applies to:
- All personal data and sensitive data processed by [Organization Name]
- All employees, contractors, and third parties who handle data
- All systems and processes that collect, store, or process protected data
- Data processing activities in all locations and jurisdictions`,
      },
      {
        order: 3,
        title: '3. Data Protection Principles',
        content: `### 3.1 Lawfulness, Fairness, and Transparency
Data shall be processed lawfully, fairly, and in a transparent manner. Individuals shall be informed about how their data is used.

### 3.2 Purpose Limitation
Data shall be collected for specified, explicit, and legitimate purposes and not processed in ways incompatible with those purposes.

### 3.3 Data Minimization
Only data that is necessary for the specified purposes shall be collected and retained.

### 3.4 Accuracy
Data shall be accurate and, where necessary, kept up to date. Inaccurate data shall be corrected or deleted.

### 3.5 Storage Limitation
Data shall be kept only for as long as necessary for the purposes for which it was collected.

### 3.6 Integrity and Confidentiality
Data shall be protected against unauthorized access, disclosure, alteration, and destruction using appropriate security measures.`,
      },
      {
        order: 4,
        title: '4. Data Classification',
        content: `### 4.1 Personal Data
Information relating to an identified or identifiable individual, including:
- Name, address, email, phone number
- Online identifiers and IP addresses
- Location data

### 4.2 Sensitive Personal Data
Special categories requiring additional protection:
- Health information (PHI)
- Financial data and payment card information
- Social security numbers and government IDs
- Biometric data
- Racial or ethnic origin
- Political opinions, religious beliefs

### 4.3 Handling Requirements
Each data category has specific collection, storage, access, and retention requirements detailed in the Data Handling Standard.`,
      },
      {
        order: 5,
        title: '5. Data Security Controls',
        content: `### 5.1 Encryption
- Data at rest: Sensitive data must be encrypted using AES-256 or equivalent
- Data in transit: TLS 1.2 or higher must be used for all sensitive data transfers
- Encryption keys must be managed according to the Key Management Standard

### 5.2 Access Controls
- Access to personal data shall follow the principle of least privilege
- Access shall be logged and regularly reviewed
- Multi-factor authentication is required for access to sensitive data

### 5.3 Data Masking and Tokenization
- Production data containing personal information shall not be used in non-production environments without masking
- Tokenization should be used for payment card data`,
      },
      {
        order: 6,
        title: '6. Individual Rights',
        content: `[Organization Name] respects the rights of data subjects, including:

### 6.1 Right of Access
Individuals may request access to their personal data.

### 6.2 Right to Rectification
Individuals may request correction of inaccurate data.

### 6.3 Right to Erasure
Individuals may request deletion of their data under certain circumstances.

### 6.4 Right to Data Portability
Individuals may request their data in a portable format.

### 6.5 Right to Object
Individuals may object to certain types of processing.

Requests must be responded to within the timeframes required by applicable law.`,
      },
      {
        order: 7,
        title: '7. Data Breach Response',
        content: `### 7.1 Detection and Reporting
All suspected data breaches must be reported immediately to the Security Team and Data Protection Officer.

### 7.2 Assessment
Breaches shall be assessed for:
- Type and sensitivity of data affected
- Number of individuals affected
- Potential harm to individuals
- Notification requirements

### 7.3 Notification
Regulatory authorities and affected individuals shall be notified as required by applicable law, typically within 72 hours of becoming aware of a breach.`,
      },
      {
        order: 8,
        title: '8. Third-Party Data Processing',
        content: `### 8.1 Vendor Assessment
Third parties processing personal data on behalf of [Organization Name] must:
- Demonstrate appropriate security controls
- Sign data processing agreements
- Undergo security assessments

### 8.2 Data Processing Agreements
Contracts with data processors must include:
- Scope and purpose of processing
- Security requirements
- Breach notification obligations
- Data return or destruction requirements`,
      },
    ],
  },

  // Incident Response Policy
  {
    type: 'Incident Response Policy',
    title: 'Security Incident Response Policy',
    suggestedReviewSchedule: 'Annual review and after each significant incident',
    relatedPolicies: ['Information Security Policy', 'Data Protection Policy', 'Business Continuity Policy', 'Communications Policy'],
    frameworkMappings: {
      'SOC 2': ['CC7.1', 'CC7.2', 'CC7.3', 'CC7.4', 'CC7.5'],
      'ISO 27001': ['A.5.24', 'A.5.25', 'A.5.26', 'A.5.27', 'A.5.28'],
      'NIST CSF': ['RS.AN-1', 'RS.CO-1', 'RS.CO-2', 'RS.MI-1', 'RS.RP-1'],
      'HIPAA': ['164.308(a)(6)', '164.314(a)(2)(i)'],
      'PCI DSS': ['12.10', '12.10.1', '12.10.2', '12.10.3'],
    },
    sections: [
      {
        order: 1,
        title: '1. Purpose',
        content: `This Incident Response Policy establishes the framework for identifying, responding to, and recovering from security incidents at [Organization Name]. The purpose is to:
- Enable rapid detection and response to security incidents
- Minimize the impact of incidents on business operations
- Preserve evidence for potential investigations
- Meet regulatory notification requirements
- Improve security posture through lessons learned`,
      },
      {
        order: 2,
        title: '2. Scope',
        content: `This policy covers:
- All security incidents affecting [Organization Name] systems, data, or personnel
- Incidents involving third-party systems that process organization data
- Physical security incidents affecting information assets
- Social engineering attacks targeting employees`,
      },
      {
        order: 3,
        title: '3. Incident Classification',
        content: `### 3.1 Severity Levels

| Severity | Description | Response Time |
|----------|-------------|---------------|
| **Critical** | Active breach, data exfiltration, ransomware, system-wide outage | Immediate (< 15 min) |
| **High** | Confirmed malware, unauthorized access, significant data exposure | < 1 hour |
| **Medium** | Suspicious activity, policy violations, contained incidents | < 4 hours |
| **Low** | Minor policy violations, failed attack attempts | < 24 hours |

### 3.2 Incident Types
- Malware infections
- Unauthorized access
- Data breaches
- Denial of service attacks
- Social engineering
- Physical security breaches
- Insider threats`,
      },
      {
        order: 4,
        title: '4. Incident Response Team',
        content: `### 4.1 Core Team
- **Incident Commander**: Leads response efforts, makes critical decisions
- **Security Lead**: Technical investigation and containment
- **IT Operations**: System recovery and restoration
- **Legal/Compliance**: Regulatory requirements and legal guidance
- **Communications**: Internal and external communications

### 4.2 Extended Team (as needed)
- Human Resources
- Executive Leadership
- External Forensics
- Law Enforcement Liaison`,
      },
      {
        order: 5,
        title: '5. Incident Response Phases',
        content: `### 5.1 Preparation
- Maintain incident response procedures and playbooks
- Conduct regular training and tabletop exercises
- Ensure tools and resources are available
- Maintain contact lists and escalation procedures

### 5.2 Detection and Analysis
- Monitor security alerts and logs
- Validate and triage incidents
- Determine scope and impact
- Document initial findings

### 5.3 Containment
- Implement short-term containment to stop immediate damage
- Implement long-term containment while preparing for recovery
- Preserve evidence for investigation

### 5.4 Eradication
- Remove malware and unauthorized access
- Identify and address root cause
- Apply patches and security updates

### 5.5 Recovery
- Restore systems from clean backups
- Verify system integrity
- Monitor for recurrence
- Return to normal operations

### 5.6 Post-Incident
- Conduct lessons learned review
- Update procedures and controls
- Document incident for compliance
- Provide management report`,
      },
      {
        order: 6,
        title: '6. Reporting and Notification',
        content: `### 6.1 Internal Reporting
All suspected incidents must be reported immediately to:
- Security Team: security@[organization].com
- Hotline: [Security Hotline Number]

### 6.2 External Notification
Depending on the incident type and jurisdiction:
- **Data Breaches**: Notify affected individuals and regulators within required timeframes
- **PCI Incidents**: Notify payment brands and acquirer
- **HIPAA Breaches**: Notify HHS and affected individuals
- **Law Enforcement**: Contact when criminal activity is suspected`,
      },
      {
        order: 7,
        title: '7. Evidence Handling',
        content: `### 7.1 Preservation
- Create forensic images of affected systems
- Preserve logs and network captures
- Document chain of custody
- Store evidence securely

### 7.2 Documentation
All incident activities must be documented, including:
- Timeline of events
- Actions taken
- Evidence collected
- Personnel involved
- Communications sent`,
      },
    ],
  },

  // Business Continuity Policy
  {
    type: 'Business Continuity Policy',
    title: 'Business Continuity and Disaster Recovery Policy',
    suggestedReviewSchedule: 'Annual review and testing required',
    relatedPolicies: ['Information Security Policy', 'Incident Response Policy', 'Backup and Recovery Policy'],
    frameworkMappings: {
      'SOC 2': ['A1.1', 'A1.2', 'A1.3', 'CC9.1'],
      'ISO 27001': ['A.5.29', 'A.5.30', 'A.8.13', 'A.8.14'],
      'NIST CSF': ['PR.IP-9', 'RC.RP-1', 'RC.CO-1'],
      'HIPAA': ['164.308(a)(7)', '164.310(a)(2)(i)'],
      'PCI DSS': ['12.10.1'],
    },
    sections: [
      {
        order: 1,
        title: '1. Purpose',
        content: `This Business Continuity and Disaster Recovery Policy establishes the framework for maintaining essential business functions during and after a disaster or significant disruption. The purpose is to:
- Ensure the continuity of critical business operations
- Protect employees, customers, and stakeholders
- Minimize financial and operational impact
- Enable rapid recovery from disasters`,
      },
      {
        order: 2,
        title: '2. Scope',
        content: `This policy applies to:
- All critical business processes and supporting systems
- All employees with roles in business continuity
- Third-party services that support critical operations
- All facilities and locations of [Organization Name]`,
      },
      {
        order: 3,
        title: '3. Business Impact Analysis',
        content: `### 3.1 Critical Process Identification
All business processes shall be assessed to determine:
- Maximum Tolerable Downtime (MTD)
- Recovery Time Objective (RTO)
- Recovery Point Objective (RPO)
- Dependencies on systems and personnel

### 3.2 Impact Categories
- Financial impact
- Operational impact
- Regulatory/compliance impact
- Reputational impact
- Customer impact`,
      },
      {
        order: 4,
        title: '4. Recovery Objectives',
        content: `### 4.1 Tier 1 - Mission Critical
- RTO: 4 hours or less
- RPO: 1 hour or less
- Examples: Core business applications, payment systems, customer-facing services

### 4.2 Tier 2 - Business Critical
- RTO: 24 hours
- RPO: 4 hours
- Examples: Email, internal applications, HR systems

### 4.3 Tier 3 - Business Important
- RTO: 72 hours
- RPO: 24 hours
- Examples: Development systems, non-critical reporting`,
      },
      {
        order: 5,
        title: '5. Backup and Recovery',
        content: `### 5.1 Backup Requirements
- All production data shall be backed up according to its classification
- Backups shall be encrypted and stored securely off-site
- Backup success shall be verified daily

### 5.2 Recovery Testing
- Backup restoration shall be tested quarterly
- Full disaster recovery tests shall be conducted annually
- Test results shall be documented and issues remediated`,
      },
      {
        order: 6,
        title: '6. Disaster Recovery Procedures',
        content: `### 6.1 Activation Criteria
The BC/DR plan shall be activated when:
- Critical systems are unavailable beyond acceptable thresholds
- Facilities are inaccessible
- A disaster declaration is made by management

### 6.2 Recovery Site
- [Organization Name] maintains [hot/warm/cold] standby capability
- Recovery site can be activated within [X hours]
- Regular failover testing ensures readiness`,
      },
      {
        order: 7,
        title: '7. Testing and Maintenance',
        content: `### 7.1 Testing Schedule
- **Quarterly**: Backup restoration tests
- **Semi-annually**: Tabletop exercises
- **Annually**: Full DR test with failover

### 7.2 Plan Maintenance
- Plans shall be reviewed and updated annually
- Contact lists shall be updated quarterly
- Changes to critical systems trigger plan review`,
      },
    ],
  },

  // Vendor Management Policy
  {
    type: 'Vendor Management Policy',
    title: 'Third-Party Risk Management Policy',
    suggestedReviewSchedule: 'Annual review required',
    relatedPolicies: ['Information Security Policy', 'Data Protection Policy', 'Procurement Policy'],
    frameworkMappings: {
      'SOC 2': ['CC9.2', 'CC3.2', 'CC3.4'],
      'ISO 27001': ['A.5.19', 'A.5.20', 'A.5.21', 'A.5.22', 'A.5.23'],
      'NIST CSF': ['ID.SC-1', 'ID.SC-2', 'ID.SC-3'],
      'HIPAA': ['164.308(b)(1)', '164.314(a)'],
      'PCI DSS': ['12.8', '12.8.1', '12.8.2', '12.8.3'],
    },
    sections: [
      {
        order: 1,
        title: '1. Purpose',
        content: `This Third-Party Risk Management Policy establishes requirements for assessing and managing risks associated with vendors, suppliers, and other third parties. The purpose is to:
- Protect [Organization Name]'s information and systems from third-party risks
- Ensure vendors meet security and compliance requirements
- Establish ongoing monitoring of vendor relationships
- Define contractual security requirements`,
      },
      {
        order: 2,
        title: '2. Scope',
        content: `This policy applies to:
- All third parties that access, process, or store [Organization Name] data
- All third parties that provide services affecting security or compliance
- All cloud service providers and SaaS applications
- Subcontractors and fourth parties of primary vendors`,
      },
      {
        order: 3,
        title: '3. Vendor Risk Tiering',
        content: `### 3.1 Critical Vendors (Tier 1)
- Process sensitive data or have system access
- Single points of failure for critical processes
- Required annual security assessment
- Quarterly review of performance and incidents

### 3.2 High Risk Vendors (Tier 2)
- Handle internal data or provide significant services
- Annual security questionnaire review
- Semi-annual performance review

### 3.3 Standard Vendors (Tier 3)
- Limited data access or service scope
- Assessment at onboarding and contract renewal
- Annual review`,
      },
      {
        order: 4,
        title: '4. Vendor Assessment',
        content: `### 4.1 Pre-Engagement Assessment
Before engaging a vendor:
- Security questionnaire completion
- Review of certifications (SOC 2, ISO 27001)
- Assessment of data handling practices
- Evaluation of financial stability

### 4.2 Assessment Criteria
- Information security policies and controls
- Access management practices
- Incident response capabilities
- Business continuity planning
- Compliance with applicable regulations
- Subcontractor management`,
      },
      {
        order: 5,
        title: '5. Contractual Requirements',
        content: `### 5.1 Security Requirements
Vendor contracts must include:
- Data protection and security requirements
- Right to audit clause
- Breach notification requirements
- Data return/destruction obligations
- Insurance requirements

### 5.2 Service Level Agreements
- Availability and performance metrics
- Support response times
- Escalation procedures
- Penalties for non-compliance`,
      },
      {
        order: 6,
        title: '6. Ongoing Monitoring',
        content: `### 6.1 Continuous Monitoring
- Review of vendor security ratings and threat intelligence
- Monitoring for security incidents affecting vendors
- Tracking of vendor compliance certifications

### 6.2 Periodic Reviews
- Annual reassessment for critical vendors
- Review of access rights and permissions
- Evaluation of service performance
- Assessment of continued business need`,
      },
      {
        order: 7,
        title: '7. Vendor Termination',
        content: `### 7.1 Offboarding Requirements
- Revocation of all access within 24 hours
- Confirmation of data return or destruction
- Retrieval of organization assets
- Documentation of termination activities

### 7.2 Data Handling
Vendors must:
- Return all data in agreed format
- Provide certification of data destruction
- Remove data from all systems including backups`,
      },
    ],
  },

  // Risk Management Policy
  {
    type: 'Risk Management Policy',
    title: 'Enterprise Risk Management Policy',
    suggestedReviewSchedule: 'Annual review required',
    relatedPolicies: ['Information Security Policy', 'Business Continuity Policy', 'Compliance Policy'],
    frameworkMappings: {
      'SOC 2': ['CC3.1', 'CC3.2', 'CC3.3', 'CC3.4', 'CC5.1'],
      'ISO 27001': ['A.5.1', 'A.5.7', 'A.5.8'],
      'NIST CSF': ['ID.RA-1', 'ID.RA-2', 'ID.RA-3', 'ID.RA-4', 'ID.RA-5', 'ID.RA-6'],
      'HIPAA': ['164.308(a)(1)(ii)(A)', '164.308(a)(1)(ii)(B)'],
      'PCI DSS': ['12.2'],
    },
    sections: [
      {
        order: 1,
        title: '1. Purpose',
        content: `This Enterprise Risk Management Policy establishes the framework for identifying, assessing, and managing risks across [Organization Name]. The purpose is to:
- Establish a consistent approach to risk management
- Enable informed decision-making based on risk
- Protect the organization from threats to its objectives
- Ensure compliance with regulatory requirements`,
      },
      {
        order: 2,
        title: '2. Scope',
        content: `This policy applies to:
- All organizational risks including strategic, operational, financial, and compliance risks
- All departments and business units
- All risk management activities including identification, assessment, treatment, and monitoring
- Third-party risks affecting the organization`,
      },
      {
        order: 3,
        title: '3. Risk Management Framework',
        content: `### 3.1 Risk Identification
- Regular risk assessments shall be conducted
- Risks shall be identified from multiple sources including audits, incidents, and industry intelligence
- All employees are responsible for identifying and reporting risks

### 3.2 Risk Assessment
Risks shall be assessed based on:
- **Likelihood**: Probability of occurrence (1-5 scale)
- **Impact**: Consequence if realized (1-5 scale)
- **Risk Score**: Likelihood × Impact

### 3.3 Risk Rating Matrix

| Impact ↓ / Likelihood → | 1-Rare | 2-Unlikely | 3-Possible | 4-Likely | 5-Almost Certain |
|-------------------------|--------|------------|------------|----------|------------------|
| 5-Severe | Medium | High | High | Critical | Critical |
| 4-Major | Medium | Medium | High | High | Critical |
| 3-Moderate | Low | Medium | Medium | High | High |
| 2-Minor | Low | Low | Medium | Medium | High |
| 1-Negligible | Low | Low | Low | Medium | Medium |`,
      },
      {
        order: 4,
        title: '4. Risk Treatment',
        content: `### 4.1 Treatment Options
- **Accept**: Accept the risk when within tolerance
- **Mitigate**: Implement controls to reduce likelihood or impact
- **Transfer**: Transfer risk through insurance or contracts
- **Avoid**: Eliminate the risk by not performing the activity

### 4.2 Treatment Selection
Treatment decisions shall consider:
- Cost-benefit analysis
- Risk tolerance and appetite
- Regulatory requirements
- Strategic objectives`,
      },
      {
        order: 5,
        title: '5. Risk Tolerance',
        content: `### 5.1 Risk Appetite Statement
[Organization Name] accepts moderate risk in pursuit of its objectives, with lower tolerance for risks affecting:
- Customer data and privacy
- Regulatory compliance
- Financial stability
- Reputation

### 5.2 Escalation Thresholds
- **Critical risks**: Immediate executive notification
- **High risks**: Quarterly board reporting
- **Medium risks**: Management review
- **Low risks**: Departmental tracking`,
      },
      {
        order: 6,
        title: '6. Monitoring and Reporting',
        content: `### 6.1 Risk Register
- All identified risks shall be documented in the risk register
- Risk owners shall be assigned for each risk
- Status shall be updated at least quarterly

### 6.2 Reporting
- Quarterly risk reports to management
- Annual risk report to the board
- Immediate reporting of critical risks`,
      },
    ],
  },

  // Change Management Policy
  {
    type: 'Change Management Policy',
    title: 'Change Management Policy',
    suggestedReviewSchedule: 'Annual review required',
    relatedPolicies: ['Information Security Policy', 'SDLC Policy', 'Configuration Management Policy'],
    frameworkMappings: {
      'SOC 2': ['CC8.1', 'CC6.1', 'CC6.2'],
      'ISO 27001': ['A.8.9', 'A.8.32'],
      'NIST CSF': ['PR.IP-3', 'DE.CM-4'],
      'HIPAA': ['164.308(a)(8)'],
      'PCI DSS': ['6.4', '6.4.1', '6.4.2', '6.4.5'],
    },
    sections: [
      {
        order: 1,
        title: '1. Purpose',
        content: `This Change Management Policy establishes a structured approach to managing changes to [Organization Name]'s information systems and infrastructure. The purpose is to:
- Minimize the impact of changes on system availability and security
- Ensure changes are properly evaluated, authorized, and documented
- Maintain the integrity and security of production environments
- Enable auditability of system modifications`,
      },
      {
        order: 2,
        title: '2. Scope',
        content: `This policy applies to all changes to:
- Production systems and applications
- Network infrastructure
- Security controls and configurations
- Database schemas and stored procedures
- Operating systems and middleware
- Cloud infrastructure and services`,
      },
      {
        order: 3,
        title: '3. Change Categories',
        content: `### 3.1 Standard Changes
Pre-approved, low-risk changes following established procedures:
- Routine patching within approved windows
- User account provisioning
- Standard software installations

### 3.2 Normal Changes
Changes requiring CAB review and approval:
- Application deployments
- Infrastructure modifications
- Configuration changes

### 3.3 Emergency Changes
Urgent changes needed to resolve critical issues:
- Security vulnerability remediation
- Production incident resolution
- Requires expedited approval process`,
      },
      {
        order: 4,
        title: '4. Change Request Process',
        content: `### 4.1 Request Submission
All changes must include:
- Description of the change
- Business justification
- Risk assessment
- Testing evidence
- Rollback plan
- Implementation schedule

### 4.2 Review and Approval
- Changes reviewed by Change Advisory Board (CAB)
- Security review for changes affecting security controls
- Approval from system owners
- Documentation of approval decisions`,
      },
      {
        order: 5,
        title: '5. Testing Requirements',
        content: `### 5.1 Pre-Production Testing
- All changes must be tested in non-production environments
- Test cases must cover functionality and security
- Regression testing for critical systems

### 5.2 Test Evidence
- Test results must be documented
- Security testing for changes affecting security
- User acceptance testing where applicable`,
      },
      {
        order: 6,
        title: '6. Implementation',
        content: `### 6.1 Change Windows
- Standard changes during business hours
- High-risk changes during maintenance windows
- Emergency changes as needed with post-implementation review

### 6.2 Implementation Requirements
- Changes implemented by authorized personnel only
- Separation of duties between development and production
- Implementation documented with timestamps
- Monitoring during and after implementation`,
      },
      {
        order: 7,
        title: '7. Rollback and Post-Implementation',
        content: `### 7.1 Rollback
- All changes must have documented rollback procedures
- Rollback must be tested before production implementation
- Decision criteria for rollback defined

### 7.2 Post-Implementation Review
- Verify change achieved objectives
- Document any issues encountered
- Update documentation and configurations
- Close change request with results`,
      },
    ],
  },

  // Password/Authentication Policy
  {
    type: 'Password Policy',
    title: 'Password and Authentication Policy',
    suggestedReviewSchedule: 'Annual review, update with security best practices',
    relatedPolicies: ['Access Control Policy', 'Information Security Policy', 'Remote Access Policy'],
    frameworkMappings: {
      'SOC 2': ['CC6.1', 'CC6.2'],
      'ISO 27001': ['A.5.17', 'A.8.5'],
      'NIST CSF': ['PR.AC-1', 'PR.AC-7'],
      'HIPAA': ['164.312(d)'],
      'PCI DSS': ['8.2', '8.2.1', '8.2.3', '8.2.4', '8.3', '8.3.1'],
    },
    sections: [
      {
        order: 1,
        title: '1. Purpose',
        content: `This Password and Authentication Policy establishes requirements for creating and maintaining secure authentication credentials. The purpose is to:
- Protect [Organization Name] systems from unauthorized access
- Establish strong authentication standards
- Define password requirements aligned with industry best practices
- Ensure compliance with regulatory requirements`,
      },
      {
        order: 2,
        title: '2. Scope',
        content: `This policy applies to:
- All user accounts on [Organization Name] systems
- All employees, contractors, and third parties with system access
- All authentication methods including passwords, MFA, and biometrics
- Service accounts and API credentials`,
      },
      {
        order: 3,
        title: '3. Password Requirements',
        content: `### 3.1 Password Complexity
All passwords must meet these minimum requirements:
- **Length**: Minimum 12 characters (16+ recommended)
- **Complexity**: Include characters from at least 3 of 4 categories:
  - Uppercase letters (A-Z)
  - Lowercase letters (a-z)
  - Numbers (0-9)
  - Special characters (!@#$%^&*...)

### 3.2 Password Restrictions
- Cannot contain username or real name
- Cannot be a common password or dictionary word
- Cannot reuse last 12 passwords
- Cannot be shared with anyone

### 3.3 Passphrases
Passphrases of 15+ characters with spaces are encouraged as they are both secure and memorable.`,
      },
      {
        order: 4,
        title: '4. Password Management',
        content: `### 4.1 Password Changes
- Standard accounts: Recommended change every 90 days
- Privileged accounts: Required change every 60 days
- Immediate change required if compromise is suspected

### 4.2 Password Storage
- Passwords must be stored using approved password managers
- Never store passwords in plain text
- Never store passwords in browsers on shared systems
- Never write passwords down or share via email/chat`,
      },
      {
        order: 5,
        title: '5. Multi-Factor Authentication',
        content: `### 5.1 MFA Requirements
Multi-factor authentication is required for:
- All remote access connections
- All privileged/administrative accounts
- Access to systems containing sensitive data
- Cloud service administration
- VPN access

### 5.2 Approved MFA Methods
- Hardware security keys (preferred)
- Authenticator applications (TOTP)
- Push notifications from approved apps
- SMS codes (least preferred, being phased out)`,
      },
      {
        order: 6,
        title: '6. Account Lockout',
        content: `### 6.1 Lockout Policy
- Accounts lock after 5 consecutive failed login attempts
- Lockout duration: 30 minutes minimum
- Administrator intervention required for extended lockouts

### 6.2 Monitoring
- Failed login attempts are logged and monitored
- Automated alerts for unusual login patterns
- Geographic anomaly detection enabled`,
      },
      {
        order: 7,
        title: '7. Service Accounts and API Keys',
        content: `### 7.1 Service Accounts
- Must follow password complexity requirements
- Passwords stored in approved secrets manager
- Regular rotation (at least annually)
- Documented ownership and purpose

### 7.2 API Keys and Tokens
- Must be stored securely (never in code)
- Rotated regularly per defined schedule
- Scoped to minimum required permissions
- Revoked immediately when no longer needed`,
      },
    ],
  },
];

/**
 * Get a policy template by type
 */
export function getPolicyTemplate(policyType: string): PolicyTemplate | undefined {
  return POLICY_TEMPLATES.find(
    t => t.type.toLowerCase().includes(policyType.toLowerCase()) ||
      policyType.toLowerCase().includes(t.type.toLowerCase().split(' ')[0])
  );
}

/**
 * Get all available policy types
 */
export function getAvailablePolicyTypes(): string[] {
  return POLICY_TEMPLATES.map(t => t.type);
}

/**
 * Generate full policy content from template
 */
export function generatePolicyContent(
  template: PolicyTemplate,
  organizationName: string,
  frameworks: string[],
  industry?: string
): string {
  let content = `# ${replacePlaceholders(template.title, organizationName, industry)}\n\n`;
  content += `**Organization:** ${organizationName}\n`;
  content += `**Effective Date:** [Current Date]\n`;
  content += `**Last Reviewed:** [Current Date]\n`;
  content += `**Next Review:** [Review Date]\n\n`;
  content += `---\n`;

  // Add framework compliance section if frameworks specified
  if (frameworks.length > 0) {
    content += getFrameworkRequirements(frameworks);
    content += '\n\n---\n';
  }

  // Add each section
  for (const section of template.sections) {
    content += `\n${replacePlaceholders(section.title, organizationName, industry)}\n\n`;
    content += replacePlaceholders(section.content, organizationName, industry);
    content += '\n';
  }

  // Replace date placeholders
  content = replacePlaceholders(content, organizationName, industry);

  return content;
}
