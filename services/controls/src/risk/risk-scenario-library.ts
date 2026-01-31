 
/**
 * Built-in Risk Scenario Library
 * 
 * These are global templates available to all organizations.
 * Users can browse the library and clone scenarios into their organization.
 * Organizations cannot delete global templates, only their own scenarios.
 */

export interface RiskScenarioTemplate {
  id: string; // Fixed ID for idempotent seeding
  title: string;
  description: string;
  category: string;
  threatActor: string;
  attackVector: string;
  targetAssets: string[];
  likelihood: string;
  impact: string;
  tags: string[];
  mitigationStrategy: string;
  businessContext: string;
  complianceImpact: string;
}

export const RISK_SCENARIO_LIBRARY: RiskScenarioTemplate[] = [
  // ============================================
  // DATA BREACH SCENARIOS
  // ============================================
  {
    id: 'lib-scenario-001',
    title: 'Phishing Attack Leading to Data Breach',
    description: 'A sophisticated spear-phishing campaign targets employees with access to sensitive customer data, potentially leading to unauthorized data exfiltration through compromised credentials or malware installation.',
    category: 'Data Breach',
    threatActor: 'external_attacker',
    attackVector: 'phishing',
    targetAssets: ['Email System', 'Customer Database', 'CRM', 'Cloud Storage'],
    likelihood: 'likely',
    impact: 'severe',
    tags: ['phishing', 'data-breach', 'employee-risk', 'credentials'],
    mitigationStrategy: 'Implement advanced email filtering with sandboxing, conduct regular security awareness training with phishing simulations, enforce MFA on all systems, deploy DLP solutions to detect data exfiltration, and establish incident response procedures for compromised accounts.',
    businessContext: 'Customer data breach could result in regulatory fines (GDPR up to 4% of revenue), class action lawsuits, and significant reputational damage affecting customer trust and retention.',
    complianceImpact: 'GDPR Article 33 (breach notification), SOC 2 CC6.1 (logical access), HIPAA 164.308 (security awareness), PCI-DSS 12.6 (security awareness program)',
  },
  {
    id: 'lib-scenario-002',
    title: 'Insider Data Theft',
    description: 'A malicious insider with privileged access exfiltrates sensitive intellectual property, customer data, or financial information before leaving the organization or while employed.',
    category: 'Data Breach',
    threatActor: 'insider_malicious',
    attackVector: 'insider_access',
    targetAssets: ['Source Code Repository', 'Customer Database', 'Financial Systems', 'Trade Secrets'],
    likelihood: 'possible',
    impact: 'major',
    tags: ['insider-threat', 'data-exfiltration', 'privileged-access', 'ip-theft'],
    mitigationStrategy: 'Implement DLP with content inspection, deploy user behavior analytics (UBA/UEBA), conduct quarterly access reviews, enforce least privilege access, establish secure offboarding procedures with access revocation checklists, and monitor for unusual data access patterns.',
    businessContext: 'IP theft could provide competitive advantage to rivals. Trade secret theft can result in loss of market position and years of R&D investment.',
    complianceImpact: 'SOC 2 CC6.3 (access removal), ISO 27001 A.9.2.6 (access rights review), NIST 800-53 AC-2 (account management)',
  },
  {
    id: 'lib-scenario-003',
    title: 'Credential Stuffing Attack',
    description: 'Automated attacks using leaked credential databases from other breaches to gain unauthorized access to user accounts through credential reuse, potentially leading to account takeover and data theft.',
    category: 'Data Breach',
    threatActor: 'external_attacker',
    attackVector: 'brute_force',
    targetAssets: ['User Authentication', 'Customer Accounts', 'Admin Portal', 'API Endpoints'],
    likelihood: 'almost_certain',
    impact: 'moderate',
    tags: ['credential-stuffing', 'account-takeover', 'authentication', 'automation'],
    mitigationStrategy: 'Enforce MFA for all users, implement rate limiting and account lockout policies, deploy bot detection and CAPTCHA, integrate with breach detection services (HaveIBeenPwned), require password complexity and check against known breached passwords.',
    businessContext: 'With credential reuse rates of 60-80%, any major breach exposes users to credential stuffing. Customer account takeovers lead to fraud and support costs.',
    complianceImpact: 'SOC 2 CC6.1 (logical access), NIST 800-63 (digital identity guidelines), PCI-DSS 8.2 (authentication management)',
  },

  // ============================================
  // SYSTEM COMPROMISE SCENARIOS
  // ============================================
  {
    id: 'lib-scenario-004',
    title: 'Ransomware Attack on Critical Infrastructure',
    description: 'Ransomware deployment through compromised credentials, unpatched vulnerabilities, or phishing leading to encryption of critical business systems, backup systems, and potential data exfiltration for double extortion.',
    category: 'System Compromise',
    threatActor: 'organized_crime',
    attackVector: 'malware',
    targetAssets: ['File Servers', 'Database Servers', 'Backup Systems', 'Active Directory'],
    likelihood: 'possible',
    impact: 'severe',
    tags: ['ransomware', 'business-continuity', 'critical', 'double-extortion'],
    mitigationStrategy: 'Maintain air-gapped and immutable backups with regular restoration testing, implement EDR with behavioral detection, establish regular patching cadence, segment networks to contain lateral movement, deploy email security with attachment sandboxing, and develop ransomware-specific incident response playbook.',
    businessContext: 'Business interruption could cost $50K-$500K per day in lost revenue. Average ransomware payment in 2024 exceeds $1.5M. Recovery without payment averages 23 days.',
    complianceImpact: 'SOC 2 CC7.2 (incident management), ISO 27001 A.12.2 (malware protection), NIST CSF PR.IP-4 (backups)',
  },
  {
    id: 'lib-scenario-005',
    title: 'API Security Vulnerability Exploitation',
    description: 'Attackers exploit vulnerabilities in exposed APIs including broken authentication, injection flaws, excessive data exposure, or broken function-level authorization to access or manipulate sensitive data.',
    category: 'System Compromise',
    threatActor: 'external_attacker',
    attackVector: 'api',
    targetAssets: ['REST APIs', 'GraphQL Endpoints', 'Mobile Backend', 'Partner Integrations'],
    likelihood: 'possible',
    impact: 'major',
    tags: ['api-security', 'owasp', 'application-security', 'injection'],
    mitigationStrategy: 'Deploy API gateway with authentication and rate limiting, implement input validation and output encoding, use parameterized queries to prevent injection, conduct regular API security testing (DAST/SAST), follow OWASP API Security Top 10 guidelines, implement proper error handling without information disclosure.',
    businessContext: 'APIs handle millions of requests daily with sensitive data. API breaches expose more records on average than other attack vectors.',
    complianceImpact: 'SOC 2 CC6.1 (logical access), OWASP API Security Top 10, PCI-DSS 6.5 (secure coding)',
  },
  {
    id: 'lib-scenario-006',
    title: 'Zero-Day Vulnerability Exploitation',
    description: 'Attackers exploit previously unknown vulnerabilities in software or systems before patches are available, potentially gaining persistent access to critical infrastructure.',
    category: 'System Compromise',
    threatActor: 'nation_state',
    attackVector: 'web_application',
    targetAssets: ['Web Applications', 'VPN Appliances', 'Email Servers', 'Operating Systems'],
    likelihood: 'unlikely',
    impact: 'severe',
    tags: ['zero-day', 'apt', 'advanced-threat', 'nation-state'],
    mitigationStrategy: 'Implement defense-in-depth with multiple security layers, deploy EDR with behavioral analysis, maintain network segmentation, enable comprehensive logging and monitoring, establish threat intelligence feeds, participate in vulnerability disclosure programs, and maintain incident response capabilities.',
    businessContext: 'Zero-days are typically used by sophisticated actors targeting high-value organizations. Defense relies on detection and response rather than prevention alone.',
    complianceImpact: 'SOC 2 CC7.1 (detection), ISO 27001 A.12.6 (technical vulnerability management), NIST CSF DE.CM (security continuous monitoring)',
  },

  // ============================================
  // SERVICE DISRUPTION SCENARIOS
  // ============================================
  {
    id: 'lib-scenario-007',
    title: 'DDoS Attack on Public Services',
    description: 'Distributed denial of service attack targeting public-facing applications, APIs, and infrastructure causing service unavailability, customer impact, and potential SLA breaches.',
    category: 'Service Disruption',
    threatActor: 'hacktivist',
    attackVector: 'network',
    targetAssets: ['Web Application', 'API Gateway', 'CDN', 'DNS Infrastructure'],
    likelihood: 'likely',
    impact: 'moderate',
    tags: ['ddos', 'availability', 'network', 'volumetric'],
    mitigationStrategy: 'Deploy DDoS protection service (Cloudflare, AWS Shield, Akamai), use CDN with DDoS mitigation capabilities, implement auto-scaling infrastructure, establish traffic baseline and anomaly detection, create DDoS response playbook, and maintain relationships with ISP for upstream filtering.',
    businessContext: 'Service unavailability directly impacts revenue for e-commerce and SaaS. Reputational damage and customer churn follow extended outages. SLA penalties may apply.',
    complianceImpact: 'SOC 2 A1.1 (availability), ISO 27001 A.17 (business continuity), contractual SLA commitments',
  },
  {
    id: 'lib-scenario-008',
    title: 'Cloud Provider Outage',
    description: 'Major cloud service provider experiences regional or global outage affecting availability of hosted applications, data, and services with extended recovery time.',
    category: 'Service Disruption',
    threatActor: 'natural_disaster',
    attackVector: 'network',
    targetAssets: ['Cloud Infrastructure', 'SaaS Applications', 'Data Storage', 'Compute Resources'],
    likelihood: 'possible',
    impact: 'major',
    tags: ['cloud', 'availability', 'third-party', 'disaster-recovery'],
    mitigationStrategy: 'Implement multi-region or multi-cloud architecture for critical services, maintain documented disaster recovery procedures, establish RTO/RPO requirements and test regularly, use infrastructure as code for rapid redeployment, monitor cloud provider status and have communication plan ready.',
    businessContext: 'Single cloud provider dependency creates concentration risk. Major cloud outages occur several times per year and can last hours to days.',
    complianceImpact: 'SOC 2 A1.2 (recovery), ISO 27001 A.17.1 (business continuity planning), NIST CSF PR.IP-9 (recovery plans)',
  },

  // ============================================
  // THIRD PARTY RISK SCENARIOS
  // ============================================
  {
    id: 'lib-scenario-009',
    title: 'Third-Party Vendor Data Breach',
    description: 'A critical SaaS vendor or service provider experiences a security breach that exposes data shared through their platform, potentially affecting customer data, credentials, or providing attack vector into connected systems.',
    category: 'Third Party Risk',
    threatActor: 'external_attacker',
    attackVector: 'supply_chain',
    targetAssets: ['Vendor Integrations', 'API Connections', 'Shared Data', 'SSO Connections'],
    likelihood: 'possible',
    impact: 'major',
    tags: ['supply-chain', 'third-party', 'vendor-risk', 'data-sharing'],
    mitigationStrategy: 'Conduct vendor security assessments before onboarding, include security requirements in contracts, implement continuous monitoring of vendor security posture, maintain vendor inventory with data classification, establish incident notification requirements, and have vendor offboarding procedures ready.',
    businessContext: 'Organizations depend on 50+ vendors on average, each representing potential breach exposure. Third-party breaches often affect multiple customers simultaneously.',
    complianceImpact: 'SOC 2 CC9.2 (vendor management), ISO 27001 A.15.1 (supplier relationships), GDPR Article 28 (processor requirements)',
  },
  {
    id: 'lib-scenario-010',
    title: 'Software Supply Chain Attack',
    description: 'Compromise of software dependencies, build systems, or update mechanisms leading to distribution of malicious code through trusted software channels (similar to SolarWinds, Log4j events).',
    category: 'Third Party Risk',
    threatActor: 'nation_state',
    attackVector: 'supply_chain',
    targetAssets: ['Software Dependencies', 'Build Pipeline', 'Package Managers', 'Update Systems'],
    likelihood: 'unlikely',
    impact: 'severe',
    tags: ['supply-chain', 'software', 'dependencies', 'sbom'],
    mitigationStrategy: 'Maintain Software Bill of Materials (SBOM), implement dependency scanning in CI/CD, pin and verify package versions, use private package registries, monitor for vulnerability disclosures, sign and verify software artifacts, and establish rapid patching procedures.',
    businessContext: 'Software supply chain attacks are increasing in frequency and sophistication. A single compromised dependency can affect thousands of organizations.',
    complianceImpact: 'NIST SSDF (secure software development), EO 14028 (software supply chain security), SOC 2 CC8.1 (change management)',
  },

  // ============================================
  // CLOUD SECURITY SCENARIOS
  // ============================================
  {
    id: 'lib-scenario-011',
    title: 'Cloud Storage Misconfiguration',
    description: 'Misconfigured cloud storage (S3 buckets, Azure blobs, GCS) with public access or overly permissive IAM policies exposing sensitive data to unauthorized access or internet exposure.',
    category: 'Cloud Security',
    threatActor: 'insider_negligent',
    attackVector: 'web_application',
    targetAssets: ['AWS S3 Buckets', 'Azure Blob Storage', 'Google Cloud Storage', 'Database Backups'],
    likelihood: 'likely',
    impact: 'major',
    tags: ['cloud', 'misconfiguration', 'storage', 'data-exposure'],
    mitigationStrategy: 'Deploy Cloud Security Posture Management (CSPM) tools, implement infrastructure as code with security review, enable cloud-native security services (GuardDuty, Security Center), enforce encryption at rest and in transit, use SCPs/policies to prevent public buckets, and conduct regular cloud security assessments.',
    businessContext: 'Cloud misconfigurations are the leading cause of cloud data breaches. Automated scanners continuously search for exposed storage.',
    complianceImpact: 'SOC 2 CC6.1 (logical access), CIS Benchmarks for cloud providers, NIST 800-53 AC-3 (access enforcement)',
  },
  {
    id: 'lib-scenario-012',
    title: 'Container/Kubernetes Security Breach',
    description: 'Exploitation of container vulnerabilities, misconfigured Kubernetes clusters, or compromised container images leading to unauthorized access, privilege escalation, or lateral movement within container infrastructure.',
    category: 'Cloud Security',
    threatActor: 'external_attacker',
    attackVector: 'web_application',
    targetAssets: ['Kubernetes Clusters', 'Container Registry', 'Container Workloads', 'Service Mesh'],
    likelihood: 'possible',
    impact: 'major',
    tags: ['kubernetes', 'containers', 'docker', 'cloud-native'],
    mitigationStrategy: 'Implement container image scanning in CI/CD, enforce pod security standards, use network policies for microsegmentation, enable RBAC with least privilege, deploy runtime security monitoring, regularly update and patch container images, and follow CIS Kubernetes Benchmarks.',
    businessContext: 'Container adoption continues to grow with organizations running thousands of containers. Kubernetes misconfigurations are common and can expose entire clusters.',
    complianceImpact: 'CIS Kubernetes Benchmark, NIST 800-190 (container security), SOC 2 CC6.1 (logical access)',
  },

  // ============================================
  // FINANCIAL FRAUD SCENARIOS
  // ============================================
  {
    id: 'lib-scenario-013',
    title: 'Business Email Compromise (BEC)',
    description: 'Targeted social engineering attacks impersonating executives or vendors to trick employees into making fraudulent wire transfers, changing payment details, or disclosing sensitive information.',
    category: 'Financial Fraud',
    threatActor: 'organized_crime',
    attackVector: 'social_engineering',
    targetAssets: ['Executive Email', 'Finance Department', 'Wire Transfer Systems', 'Vendor Payments'],
    likelihood: 'likely',
    impact: 'severe',
    tags: ['bec', 'wire-fraud', 'social-engineering', 'executive-impersonation'],
    mitigationStrategy: 'Implement verification procedures for financial transactions (dual approval, callback verification), deploy email authentication (DMARC/DKIM/SPF), train finance staff on BEC tactics, establish out-of-band confirmation for payment changes, and implement controls for new vendor onboarding.',
    businessContext: 'BEC losses exceeded $2.7B in 2022. Average loss per incident is $125K. Wire transfers are often unrecoverable once sent.',
    complianceImpact: 'SOC 2 CC5.2 (control activities), SOX controls for financial processes, internal audit requirements',
  },
  {
    id: 'lib-scenario-014',
    title: 'Payment Card Fraud / Skimming',
    description: 'Compromise of payment processing systems, web skimming attacks (Magecart-style), or point-of-sale malware leading to theft of customer payment card data.',
    category: 'Financial Fraud',
    threatActor: 'organized_crime',
    attackVector: 'web_application',
    targetAssets: ['Payment Gateway', 'E-commerce Platform', 'POS Systems', 'Customer Payment Data'],
    likelihood: 'possible',
    impact: 'severe',
    tags: ['pci', 'payment-fraud', 'magecart', 'web-skimming'],
    mitigationStrategy: 'Implement Content Security Policy (CSP), use Subresource Integrity (SRI), deploy web application firewall, conduct regular PCI compliance scans, segment payment systems from general network, monitor for unauthorized script changes, and use tokenization where possible.',
    businessContext: 'Payment card breaches result in PCI fines, increased processing fees, and potential loss of ability to process cards. Brand damage affects customer trust.',
    complianceImpact: 'PCI-DSS all requirements, state breach notification laws, card brand operating regulations',
  },

  // ============================================
  // COMPLIANCE VIOLATION SCENARIOS
  // ============================================
  {
    id: 'lib-scenario-015',
    title: 'GDPR/Privacy Regulation Violation',
    description: 'Failure to meet data privacy requirements resulting in unauthorized data processing, inadequate consent management, missing data subject rights implementation, or cross-border data transfer violations.',
    category: 'Compliance Violation',
    threatActor: 'insider_negligent',
    attackVector: 'insider_access',
    targetAssets: ['Customer PII', 'Marketing Systems', 'Analytics Platforms', 'Data Warehouses'],
    likelihood: 'possible',
    impact: 'major',
    tags: ['gdpr', 'privacy', 'compliance', 'data-protection'],
    mitigationStrategy: 'Implement data mapping and inventory, deploy consent management platform, establish data subject rights workflows, conduct Data Protection Impact Assessments (DPIA), review data processing agreements, implement privacy by design in development, and appoint/train Data Protection Officer.',
    businessContext: 'GDPR fines can reach €20M or 4% of global revenue. Regulatory enforcement is increasing with focus on consent and data transfers.',
    complianceImpact: 'GDPR all articles, CCPA/CPRA, other regional privacy laws, contractual privacy commitments',
  },
  {
    id: 'lib-scenario-016',
    title: 'Unauthorized Access to Protected Health Information',
    description: 'HIPAA violation through unauthorized access, disclosure, or breach of Protected Health Information (PHI) by employees, contractors, or through security incidents.',
    category: 'Compliance Violation',
    threatActor: 'insider_negligent',
    attackVector: 'insider_access',
    targetAssets: ['EHR Systems', 'Patient Records', 'Medical Devices', 'Healthcare Applications'],
    likelihood: 'possible',
    impact: 'severe',
    tags: ['hipaa', 'phi', 'healthcare', 'compliance'],
    mitigationStrategy: 'Implement role-based access controls aligned with job function, deploy audit logging for all PHI access, conduct regular access reviews, train workforce on HIPAA requirements, encrypt PHI at rest and in transit, establish Business Associate Agreements, and implement breach detection and notification procedures.',
    businessContext: 'HIPAA penalties range from $100 to $50,000 per violation (up to $1.5M annually per category). OCR actively investigates breaches affecting 500+ individuals.',
    complianceImpact: 'HIPAA Privacy Rule, HIPAA Security Rule, HITECH Act, state health privacy laws',
  },

  // ============================================
  // PHYSICAL SECURITY SCENARIOS
  // ============================================
  {
    id: 'lib-scenario-017',
    title: 'Physical Security Breach - Office/Data Center',
    description: 'Unauthorized physical access to office facilities or data centers leading to device theft, direct system access, installation of rogue devices, or physical damage to infrastructure.',
    category: 'Physical Security',
    threatActor: 'external_attacker',
    attackVector: 'physical',
    targetAssets: ['Workstations', 'Network Equipment', 'Server Room', 'Sensitive Documents'],
    likelihood: 'unlikely',
    impact: 'moderate',
    tags: ['physical-security', 'theft', 'on-premise', 'access-control'],
    mitigationStrategy: 'Implement layered physical access controls (badges, biometrics), deploy surveillance systems with retention, establish visitor management procedures, secure server rooms with additional controls, encrypt all endpoint devices, implement clean desk policy, and conduct physical security assessments.',
    businessContext: 'Physical breaches can bypass all network security controls. Stolen devices may contain sensitive data or provide network access.',
    complianceImpact: 'ISO 27001 A.11 (physical security), SOC 2 CC6.4 (physical access), PCI-DSS 9 (physical access)',
  },

  // ============================================
  // EMERGING RISK SCENARIOS
  // ============================================
  {
    id: 'lib-scenario-018',
    title: 'AI/ML Model Attack',
    description: 'Adversarial attacks on AI/ML systems including model poisoning, evasion attacks, model extraction, or prompt injection leading to incorrect outputs, data exposure, or system manipulation.',
    category: 'AI/ML Risk',
    threatActor: 'external_attacker',
    attackVector: 'api',
    targetAssets: ['ML Models', 'Training Pipelines', 'Prediction APIs', 'LLM Applications'],
    likelihood: 'unlikely',
    impact: 'major',
    tags: ['ai-security', 'adversarial-ml', 'llm', 'emerging-threats'],
    mitigationStrategy: 'Implement input validation and sanitization for AI systems, monitor model outputs for anomalies, secure training data pipelines, use differential privacy where applicable, implement rate limiting on inference APIs, test models for adversarial robustness, and establish AI governance framework.',
    businessContext: 'AI adoption is accelerating across business functions. AI failures can have significant business impact and reputational damage.',
    complianceImpact: 'NIST AI RMF, EU AI Act, OWASP LLM Top 10, emerging AI regulations',
  },
  {
    id: 'lib-scenario-019',
    title: 'Remote Work Security Incident',
    description: 'Security incident stemming from insecure home networks, personal device compromise, lack of physical security in remote environments, or VPN/remote access vulnerabilities.',
    category: 'Remote Work',
    threatActor: 'external_attacker',
    attackVector: 'network',
    targetAssets: ['VPN Infrastructure', 'Remote Endpoints', 'Cloud Applications', 'Home Networks'],
    likelihood: 'likely',
    impact: 'moderate',
    tags: ['remote-work', 'endpoint-security', 'vpn', 'zero-trust'],
    mitigationStrategy: 'Implement zero trust architecture, deploy EDR on all endpoints, enforce VPN with MFA for network access, use cloud-native security controls, provide security guidance for home office setup, implement device compliance checking, and monitor for compromised credentials.',
    businessContext: 'Hybrid/remote work is permanent for most organizations. Attack surface has expanded significantly beyond traditional perimeter.',
    complianceImpact: 'SOC 2 CC6.1 (logical access), ISO 27001 A.6.2.2 (teleworking), NIST 800-46 (telework security)',
  },
  {
    id: 'lib-scenario-020',
    title: 'IoT/OT Device Compromise',
    description: 'Exploitation of Internet of Things or Operational Technology devices with weak security, default credentials, or unpatched vulnerabilities leading to network access, data interception, or operational disruption.',
    category: 'IoT/OT Security',
    threatActor: 'external_attacker',
    attackVector: 'network',
    targetAssets: ['IoT Devices', 'Industrial Control Systems', 'Building Management', 'Medical Devices'],
    likelihood: 'possible',
    impact: 'major',
    tags: ['iot', 'ot', 'industrial', 'embedded-systems'],
    mitigationStrategy: 'Maintain inventory of all IoT/OT devices, segment IoT networks from corporate network, change default credentials, implement firmware update procedures, monitor IoT network traffic for anomalies, disable unnecessary services, and establish procurement security requirements.',
    businessContext: 'IoT device count is growing exponentially with often minimal security. OT systems increasingly connect to IT networks creating new attack paths.',
    complianceImpact: 'NIST 800-82 (ICS security), IEC 62443 (industrial security), FDA guidance for medical devices',
  },
];




