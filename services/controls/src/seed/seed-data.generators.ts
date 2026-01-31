/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Seed Data Generators
 * Generates realistic demo data for all platform modules
 */

// Helper to get random item from array
function randomItem<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

// Helper to get random items from array
function _randomItems<T>(arr: T[], count: number): T[] {
  const shuffled = [...arr].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count);
}

// Helper to generate random date within range
function randomDate(start: Date, end: Date): Date {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
}

// Helper to generate UUID-like string
function _generateId(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

// ============================================
// FRAMEWORKS
// ============================================
export const DEMO_FRAMEWORKS = [
  {
    name: 'SOC 2 Type II',
    description: 'Service Organization Control 2 - Trust Services Criteria for Security, Availability, Processing Integrity, Confidentiality, and Privacy',
    version: '2017',
    category: 'compliance',
    status: 'active',
  },
  {
    name: 'ISO 27001:2022',
    description: 'International standard for information security management systems (ISMS)',
    version: '2022',
    category: 'compliance',
    status: 'active',
  },
  {
    name: 'HIPAA',
    description: 'Health Insurance Portability and Accountability Act - Privacy and Security Rules',
    version: '2013',
    category: 'compliance',
    status: 'active',
  },
];

// ============================================
// CONTROLS
// ============================================
export const DEMO_CONTROLS = [
  // Access Control
  { code: 'AC-001', title: 'User Access Management', category: 'Access Control', description: 'Establish and maintain user access management processes', status: 'implemented' },
  { code: 'AC-002', title: 'Multi-Factor Authentication', category: 'Access Control', description: 'Require MFA for all user accounts accessing sensitive systems', status: 'implemented' },
  { code: 'AC-003', title: 'Privileged Access Management', category: 'Access Control', description: 'Manage and monitor privileged access to critical systems', status: 'partially_implemented' },
  { code: 'AC-004', title: 'Access Reviews', category: 'Access Control', description: 'Conduct periodic access reviews for all systems', status: 'implemented' },
  { code: 'AC-005', title: 'Password Policy', category: 'Access Control', description: 'Enforce strong password requirements across all systems', status: 'implemented' },
  { code: 'AC-006', title: 'Session Management', category: 'Access Control', description: 'Implement session timeout and management controls', status: 'implemented' },
  { code: 'AC-007', title: 'Remote Access', category: 'Access Control', description: 'Secure remote access to organizational resources', status: 'implemented' },
  
  // Data Protection
  { code: 'DP-001', title: 'Data Classification', category: 'Data Protection', description: 'Classify data based on sensitivity and criticality', status: 'implemented' },
  { code: 'DP-002', title: 'Encryption at Rest', category: 'Data Protection', description: 'Encrypt sensitive data stored in databases and file systems', status: 'implemented' },
  { code: 'DP-003', title: 'Encryption in Transit', category: 'Data Protection', description: 'Use TLS 1.2+ for all data transmission', status: 'implemented' },
  { code: 'DP-004', title: 'Data Backup', category: 'Data Protection', description: 'Perform regular backups with tested restoration procedures', status: 'implemented' },
  { code: 'DP-005', title: 'Data Retention', category: 'Data Protection', description: 'Implement data retention and disposal procedures', status: 'partially_implemented' },
  { code: 'DP-006', title: 'Key Management', category: 'Data Protection', description: 'Manage cryptographic keys securely throughout their lifecycle', status: 'implemented' },
  
  // Security Operations
  { code: 'SO-001', title: 'Vulnerability Management', category: 'Security Operations', description: 'Identify, assess, and remediate vulnerabilities', status: 'implemented' },
  { code: 'SO-002', title: 'Patch Management', category: 'Security Operations', description: 'Apply security patches within defined timeframes', status: 'partially_implemented' },
  { code: 'SO-003', title: 'Security Monitoring', category: 'Security Operations', description: 'Monitor systems and networks for security events', status: 'implemented' },
  { code: 'SO-004', title: 'Incident Response', category: 'Security Operations', description: 'Establish incident response procedures', status: 'implemented' },
  { code: 'SO-005', title: 'Penetration Testing', category: 'Security Operations', description: 'Conduct annual penetration testing', status: 'implemented' },
  { code: 'SO-006', title: 'Log Management', category: 'Security Operations', description: 'Collect, store, and analyze security logs', status: 'implemented' },
  { code: 'SO-007', title: 'Malware Protection', category: 'Security Operations', description: 'Deploy and maintain anti-malware solutions', status: 'implemented' },
  
  // Network Security
  { code: 'NS-001', title: 'Network Segmentation', category: 'Network Security', description: 'Segment networks based on security requirements', status: 'implemented' },
  { code: 'NS-002', title: 'Firewall Configuration', category: 'Network Security', description: 'Configure and maintain firewalls with deny-by-default rules', status: 'implemented' },
  { code: 'NS-003', title: 'Intrusion Detection', category: 'Network Security', description: 'Deploy IDS/IPS systems to detect malicious activity', status: 'partially_implemented' },
  { code: 'NS-004', title: 'DDoS Protection', category: 'Network Security', description: 'Implement DDoS protection measures', status: 'implemented' },
  { code: 'NS-005', title: 'Wireless Security', category: 'Network Security', description: 'Secure wireless networks with WPA3 or equivalent', status: 'implemented' },
  
  // Physical Security
  { code: 'PS-001', title: 'Physical Access Control', category: 'Physical Security', description: 'Control physical access to facilities and data centers', status: 'implemented' },
  { code: 'PS-002', title: 'Visitor Management', category: 'Physical Security', description: 'Manage and log visitor access to facilities', status: 'implemented' },
  { code: 'PS-003', title: 'Environmental Controls', category: 'Physical Security', description: 'Maintain environmental controls in data centers', status: 'implemented' },
  
  // HR Security
  { code: 'HR-001', title: 'Background Checks', category: 'Human Resources', description: 'Conduct background checks for all employees', status: 'implemented' },
  { code: 'HR-002', title: 'Security Awareness Training', category: 'Human Resources', description: 'Provide annual security awareness training', status: 'implemented' },
  { code: 'HR-003', title: 'Acceptable Use Policy', category: 'Human Resources', description: 'Enforce acceptable use policy for IT resources', status: 'implemented' },
  { code: 'HR-004', title: 'Offboarding Process', category: 'Human Resources', description: 'Revoke access upon employee termination', status: 'implemented' },
  { code: 'HR-005', title: 'Code of Conduct', category: 'Human Resources', description: 'Require acknowledgment of code of conduct', status: 'partially_implemented' },
  
  // Vendor Management
  { code: 'VM-001', title: 'Vendor Risk Assessment', category: 'Vendor Management', description: 'Assess security risk of third-party vendors', status: 'implemented' },
  { code: 'VM-002', title: 'Vendor Contracts', category: 'Vendor Management', description: 'Include security requirements in vendor contracts', status: 'implemented' },
  { code: 'VM-003', title: 'Vendor Monitoring', category: 'Vendor Management', description: 'Monitor vendor compliance and security posture', status: 'partially_implemented' },
  
  // Change Management
  { code: 'CM-001', title: 'Change Management Process', category: 'Change Management', description: 'Follow formal change management procedures', status: 'implemented' },
  { code: 'CM-002', title: 'Code Review', category: 'Change Management', description: 'Require code review before deployment', status: 'implemented' },
  { code: 'CM-003', title: 'Testing Requirements', category: 'Change Management', description: 'Test changes in non-production environments', status: 'implemented' },
  { code: 'CM-004', title: 'Rollback Procedures', category: 'Change Management', description: 'Maintain rollback procedures for deployments', status: 'implemented' },
  
  // Business Continuity
  { code: 'BC-001', title: 'Business Continuity Plan', category: 'Business Continuity', description: 'Maintain and test business continuity plan', status: 'implemented' },
  { code: 'BC-002', title: 'Disaster Recovery', category: 'Business Continuity', description: 'Maintain disaster recovery capabilities', status: 'implemented' },
  { code: 'BC-003', title: 'Recovery Testing', category: 'Business Continuity', description: 'Test recovery procedures annually', status: 'partially_implemented' },
  
  // Risk Management
  { code: 'RM-001', title: 'Risk Assessment', category: 'Risk Management', description: 'Conduct periodic risk assessments', status: 'implemented' },
  { code: 'RM-002', title: 'Risk Treatment', category: 'Risk Management', description: 'Develop risk treatment plans for identified risks', status: 'implemented' },
  { code: 'RM-003', title: 'Risk Monitoring', category: 'Risk Management', description: 'Monitor and report on risk metrics', status: 'partially_implemented' },
  
  // Compliance
  { code: 'CO-001', title: 'Compliance Monitoring', category: 'Compliance', description: 'Monitor compliance with regulatory requirements', status: 'implemented' },
  { code: 'CO-002', title: 'Audit Support', category: 'Compliance', description: 'Support internal and external audits', status: 'implemented' },
  { code: 'CO-003', title: 'Policy Management', category: 'Compliance', description: 'Maintain and update security policies', status: 'implemented' },
];

// ============================================
// POLICIES
// ============================================
export const DEMO_POLICIES = [
  { title: 'Information Security Policy', category: 'information_security', description: 'Establishes the framework for protecting organizational information assets', status: 'published' },
  { title: 'Acceptable Use Policy', category: 'information_security', description: 'Defines acceptable use of IT resources and systems', status: 'published' },
  { title: 'Access Control Policy', category: 'information_security', description: 'Governs access to systems, applications, and data', status: 'published' },
  { title: 'Data Classification Policy', category: 'data_privacy', description: 'Defines data classification levels and handling requirements', status: 'published' },
  { title: 'Data Retention Policy', category: 'data_privacy', description: 'Specifies retention periods for different data types', status: 'published' },
  { title: 'Privacy Policy', category: 'data_privacy', description: 'Describes how personal information is collected and processed', status: 'published' },
  { title: 'Incident Response Policy', category: 'information_security', description: 'Outlines procedures for responding to security incidents', status: 'published' },
  { title: 'Business Continuity Policy', category: 'business_continuity', description: 'Establishes business continuity and disaster recovery requirements', status: 'published' },
  { title: 'Vendor Management Policy', category: 'vendor_management', description: 'Governs third-party vendor risk management', status: 'published' },
  { title: 'Change Management Policy', category: 'information_security', description: 'Defines change management procedures', status: 'published' },
  { title: 'Password Policy', category: 'information_security', description: 'Specifies password requirements and management', status: 'published' },
  { title: 'Remote Work Policy', category: 'human_resources', description: 'Guidelines for secure remote work', status: 'published' },
  { title: 'BYOD Policy', category: 'information_security', description: 'Bring Your Own Device security requirements', status: 'draft' },
  { title: 'Encryption Policy', category: 'information_security', description: 'Requirements for cryptographic controls', status: 'published' },
  { title: 'Physical Security Policy', category: 'physical_security', description: 'Physical access control and facility security', status: 'published' },
];

// ============================================
// VENDORS
// ============================================
export const DEMO_VENDORS = [
  { name: 'Amazon Web Services', category: 'Cloud Infrastructure', criticality: 'critical', status: 'active', website: 'https://aws.amazon.com', dataAccess: ['customer_data', 'logs', 'backups'] },
  { name: 'Google Cloud Platform', category: 'Cloud Infrastructure', criticality: 'high', status: 'active', website: 'https://cloud.google.com', dataAccess: ['analytics', 'logs'] },
  { name: 'Salesforce', category: 'CRM', criticality: 'high', status: 'active', website: 'https://salesforce.com', dataAccess: ['customer_data', 'sales_data'] },
  { name: 'Slack', category: 'Collaboration', criticality: 'medium', status: 'active', website: 'https://slack.com', dataAccess: ['communications'] },
  { name: 'GitHub', category: 'Development', criticality: 'critical', status: 'active', website: 'https://github.com', dataAccess: ['source_code'] },
  { name: 'Okta', category: 'Identity', criticality: 'critical', status: 'active', website: 'https://okta.com', dataAccess: ['identity_data', 'access_logs'] },
  { name: 'Datadog', category: 'Monitoring', criticality: 'high', status: 'active', website: 'https://datadoghq.com', dataAccess: ['logs', 'metrics'] },
  { name: 'Stripe', category: 'Payments', criticality: 'critical', status: 'active', website: 'https://stripe.com', dataAccess: ['payment_data'] },
  { name: 'Zendesk', category: 'Support', criticality: 'medium', status: 'active', website: 'https://zendesk.com', dataAccess: ['customer_data', 'tickets'] },
  { name: 'HubSpot', category: 'Marketing', criticality: 'medium', status: 'active', website: 'https://hubspot.com', dataAccess: ['marketing_data', 'contacts'] },
  { name: 'DocuSign', category: 'Legal', criticality: 'high', status: 'active', website: 'https://docusign.com', dataAccess: ['contracts'] },
  { name: 'Zoom', category: 'Collaboration', criticality: 'medium', status: 'active', website: 'https://zoom.us', dataAccess: ['communications', 'recordings'] },
  { name: 'Jira', category: 'Development', criticality: 'high', status: 'active', website: 'https://atlassian.com/jira', dataAccess: ['project_data'] },
  { name: 'BambooHR', category: 'HR', criticality: 'high', status: 'active', website: 'https://bamboohr.com', dataAccess: ['employee_data', 'pii'] },
  { name: 'KnowBe4', category: 'Security', criticality: 'medium', status: 'active', website: 'https://knowbe4.com', dataAccess: ['employee_data', 'training_data'] },
  { name: 'Cloudflare', category: 'Infrastructure', criticality: 'high', status: 'active', website: 'https://cloudflare.com', dataAccess: ['traffic_data'] },
  { name: 'Twilio', category: 'Communications', criticality: 'medium', status: 'active', website: 'https://twilio.com', dataAccess: ['communications'] },
  { name: 'Snowflake', category: 'Data Warehouse', criticality: 'high', status: 'active', website: 'https://snowflake.com', dataAccess: ['analytics_data'] },
  { name: 'PagerDuty', category: 'Operations', criticality: 'medium', status: 'active', website: 'https://pagerduty.com', dataAccess: ['incident_data'] },
  { name: 'Checkr', category: 'HR', criticality: 'medium', status: 'active', website: 'https://checkr.com', dataAccess: ['employee_data', 'background_checks'] },
];

// ============================================
// RISKS
// ============================================
export const DEMO_RISKS = [
  { title: 'Data Breach via Phishing', category: 'security', description: 'Risk of data breach through successful phishing attacks on employees', likelihood: 'likely', impact: 'critical', status: 'risk_analyzed' },
  { title: 'Ransomware Attack', category: 'security', description: 'Risk of ransomware encrypting critical business systems', likelihood: 'possible', impact: 'critical', status: 'risk_analyzed' },
  { title: 'Third-Party Data Exposure', category: 'third_party', description: 'Risk of data exposure through vendor security incident', likelihood: 'possible', impact: 'major', status: 'risk_analyzed' },
  { title: 'Insider Threat', category: 'security', description: 'Risk of data theft or sabotage by malicious insider', likelihood: 'unlikely', impact: 'major', status: 'risk_analyzed' },
  { title: 'Cloud Misconfiguration', category: 'technical', description: 'Risk of data exposure due to cloud service misconfiguration', likelihood: 'likely', impact: 'major', status: 'risk_analysis_in_progress' },
  { title: 'Regulatory Non-Compliance', category: 'compliance', description: 'Risk of fines and penalties for GDPR/CCPA violations', likelihood: 'possible', impact: 'major', status: 'risk_analyzed' },
  { title: 'API Security Vulnerability', category: 'technical', description: 'Risk of exploitation of API security vulnerabilities', likelihood: 'possible', impact: 'moderate', status: 'risk_analyzed' },
  { title: 'Business Email Compromise', category: 'security', description: 'Risk of financial fraud through business email compromise', likelihood: 'likely', impact: 'moderate', status: 'risk_analyzed' },
  { title: 'Key Personnel Departure', category: 'operational', description: 'Risk of knowledge loss from departure of key security personnel', likelihood: 'possible', impact: 'moderate', status: 'risk_identified' },
  { title: 'Supply Chain Attack', category: 'security', description: 'Risk of compromise through software supply chain attack', likelihood: 'unlikely', impact: 'critical', status: 'risk_analyzed' },
  { title: 'DDoS Attack', category: 'technical', description: 'Risk of service disruption from DDoS attacks', likelihood: 'likely', impact: 'moderate', status: 'risk_analyzed' },
  { title: 'Data Center Outage', category: 'operational', description: 'Risk of extended outage at primary data center', likelihood: 'rare', impact: 'critical', status: 'risk_analyzed' },
  { title: 'Credential Stuffing', category: 'security', description: 'Risk of account compromise through credential stuffing attacks', likelihood: 'likely', impact: 'moderate', status: 'risk_analyzed' },
  { title: 'Shadow IT', category: 'operational', description: 'Risk of unmanaged IT assets and services', likelihood: 'likely', impact: 'minor', status: 'risk_identified' },
  { title: 'Mobile Device Loss', category: 'operational', description: 'Risk of data exposure from lost or stolen mobile devices', likelihood: 'likely', impact: 'minor', status: 'risk_analyzed' },
  { title: 'Patch Management Failures', category: 'technical', description: 'Risk of exploitation due to delayed security patching', likelihood: 'possible', impact: 'major', status: 'risk_analysis_in_progress' },
  { title: 'Social Engineering', category: 'security', description: 'Risk of information disclosure through social engineering', likelihood: 'likely', impact: 'moderate', status: 'risk_analyzed' },
  { title: 'Database Exposure', category: 'technical', description: 'Risk of database exposure to unauthorized access', likelihood: 'unlikely', impact: 'critical', status: 'risk_analyzed' },
  { title: 'Insufficient Logging', category: 'technical', description: 'Risk of delayed incident detection due to insufficient logging', likelihood: 'possible', impact: 'moderate', status: 'risk_identified' },
  { title: 'Legacy System Vulnerabilities', category: 'technical', description: 'Risk of exploitation of vulnerabilities in legacy systems', likelihood: 'likely', impact: 'moderate', status: 'risk_analysis_in_progress' },
  { title: 'Contract Disputes', category: 'operational', description: 'Risk of vendor contract disputes affecting service delivery', likelihood: 'unlikely', impact: 'moderate', status: 'risk_identified' },
  { title: 'Privacy Violations', category: 'compliance', description: 'Risk of privacy law violations in data processing', likelihood: 'possible', impact: 'major', status: 'risk_analyzed' },
  { title: 'Backup Failures', category: 'technical', description: 'Risk of data loss due to backup failures', likelihood: 'unlikely', impact: 'critical', status: 'risk_analyzed' },
  { title: 'Access Creep', category: 'security', description: 'Risk of excessive access accumulation over time', likelihood: 'likely', impact: 'moderate', status: 'risk_analyzed' },
  { title: 'Physical Security Breach', category: 'physical', description: 'Risk of unauthorized physical access to facilities', likelihood: 'rare', impact: 'major', status: 'risk_analyzed' },
];

// ============================================
// EMPLOYEES
// ============================================
const FIRST_NAMES = ['James', 'Mary', 'John', 'Patricia', 'Robert', 'Jennifer', 'Michael', 'Linda', 'William', 'Elizabeth', 'David', 'Barbara', 'Richard', 'Susan', 'Joseph', 'Jessica', 'Thomas', 'Sarah', 'Christopher', 'Karen', 'Charles', 'Nancy', 'Daniel', 'Lisa', 'Matthew', 'Betty', 'Anthony', 'Margaret', 'Mark', 'Sandra', 'Donald', 'Ashley', 'Steven', 'Kimberly', 'Paul', 'Emily', 'Andrew', 'Donna', 'Joshua', 'Michelle', 'Alex', 'Jordan', 'Taylor', 'Morgan', 'Casey', 'Riley', 'Jamie', 'Quinn', 'Avery', 'Cameron'];
const LAST_NAMES = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez', 'Hernandez', 'Lopez', 'Gonzalez', 'Wilson', 'Anderson', 'Thomas', 'Taylor', 'Moore', 'Jackson', 'Martin', 'Lee', 'Perez', 'Thompson', 'White', 'Harris', 'Sanchez', 'Clark', 'Ramirez', 'Lewis', 'Robinson', 'Walker', 'Young', 'Allen', 'King', 'Wright', 'Scott', 'Torres', 'Nguyen', 'Hill', 'Flores', 'Chen', 'Kumar', 'Patel', 'Shah', 'Kim', 'Park', 'Yamamoto', 'Tanaka', 'Singh', 'Ali'];

const DEPARTMENTS = [
  { name: 'Engineering', weight: 40 },
  { name: 'Product', weight: 15 },
  { name: 'Sales', weight: 15 },
  { name: 'Marketing', weight: 8 },
  { name: 'Customer Success', weight: 7 },
  { name: 'Operations', weight: 5 },
  { name: 'Finance', weight: 4 },
  { name: 'Human Resources', weight: 3 },
  { name: 'Security', weight: 2 },
  { name: 'Legal', weight: 1 },
];

const JOB_TITLES: Record<string, string[]> = {
  'Engineering': ['Software Engineer', 'Senior Software Engineer', 'Staff Engineer', 'Engineering Manager', 'DevOps Engineer', 'QA Engineer', 'Frontend Developer', 'Backend Developer'],
  'Product': ['Product Manager', 'Senior Product Manager', 'Product Designer', 'UX Designer', 'Product Analyst'],
  'Sales': ['Account Executive', 'Sales Development Rep', 'Sales Manager', 'Enterprise Account Executive', 'Sales Engineer'],
  'Marketing': ['Marketing Manager', 'Content Marketing', 'Demand Generation', 'Marketing Analyst', 'Brand Manager'],
  'Customer Success': ['Customer Success Manager', 'Support Engineer', 'Implementation Specialist', 'Technical Account Manager'],
  'Operations': ['Operations Manager', 'Business Analyst', 'Project Manager', 'IT Support Specialist'],
  'Finance': ['Financial Analyst', 'Controller', 'Accountant', 'FP&A Manager'],
  'Human Resources': ['HR Manager', 'Recruiter', 'HR Generalist', 'People Operations'],
  'Security': ['Security Engineer', 'Security Analyst', 'CISO', 'Compliance Manager'],
  'Legal': ['General Counsel', 'Legal Counsel', 'Contract Manager', 'Paralegal'],
};

export function generateEmployees(count: number): any[] {
  const employees: any[] = [];
  const usedEmails = new Set<string>();
  
  // Build weighted department pool
  const deptPool: string[] = [];
  for (const dept of DEPARTMENTS) {
    for (let i = 0; i < dept.weight; i++) {
      deptPool.push(dept.name);
    }
  }
  
  for (let i = 0; i < count; i++) {
    const firstName = randomItem(FIRST_NAMES);
    const lastName = randomItem(LAST_NAMES);
    let email = `${firstName.toLowerCase()}.${lastName.toLowerCase()}@acme.com`;
    
    // Handle duplicates
    let counter = 1;
    while (usedEmails.has(email)) {
      email = `${firstName.toLowerCase()}.${lastName.toLowerCase()}${counter}@acme.com`;
      counter++;
    }
    usedEmails.add(email);
    
    const department = randomItem(deptPool);
    const jobTitle = randomItem(JOB_TITLES[department] || ['Specialist']);
    
    employees.push({
      email,
      firstName,
      lastName,
      department,
      jobTitle,
      employmentStatus: 'active',
      employmentType: Math.random() > 0.1 ? 'full_time' : 'contractor',
      hireDate: randomDate(new Date('2020-01-01'), new Date('2025-06-01')),
      location: randomItem(['San Francisco, CA', 'New York, NY', 'Austin, TX', 'Seattle, WA', 'Remote']),
    });
  }
  
  return employees;
}

// ============================================
// TRAINING COURSES
// ============================================
export const DEMO_TRAINING_COURSES = [
  { name: 'Security Awareness Training 2025', type: 'required', duration: 45 },
  { name: 'Phishing Prevention Basics', type: 'required', duration: 20 },
  { name: 'GDPR Compliance Essentials', type: 'required', duration: 30 },
  { name: 'Password Security Best Practices', type: 'required', duration: 15 },
  { name: 'Social Engineering Defense', type: 'required', duration: 25 },
  { name: 'Data Handling Procedures', type: 'required', duration: 20 },
  { name: 'Insider Threat Awareness', type: 'optional', duration: 30 },
  { name: 'Mobile Device Security', type: 'optional', duration: 15 },
  { name: 'Secure Coding Practices', type: 'optional', duration: 60 },
  { name: 'Cloud Security Fundamentals', type: 'optional', duration: 45 },
];

// ============================================
// ASSETS
// ============================================
export const DEMO_ASSET_TYPES = {
  laptops: [
    { name: 'MacBook Pro 14"', manufacturer: 'Apple', type: 'laptop' },
    { name: 'MacBook Pro 16"', manufacturer: 'Apple', type: 'laptop' },
    { name: 'MacBook Air M2', manufacturer: 'Apple', type: 'laptop' },
    { name: 'ThinkPad X1 Carbon', manufacturer: 'Lenovo', type: 'laptop' },
    { name: 'Dell XPS 15', manufacturer: 'Dell', type: 'laptop' },
  ],
  phones: [
    { name: 'iPhone 15 Pro', manufacturer: 'Apple', type: 'phone' },
    { name: 'iPhone 15', manufacturer: 'Apple', type: 'phone' },
    { name: 'Pixel 8 Pro', manufacturer: 'Google', type: 'phone' },
  ],
  servers: [
    { name: 'Production Web Server', type: 'server', category: 'infrastructure' },
    { name: 'Database Server', type: 'server', category: 'infrastructure' },
    { name: 'CI/CD Server', type: 'server', category: 'infrastructure' },
    { name: 'Staging Environment', type: 'server', category: 'infrastructure' },
  ],
  cloud: [
    { name: 'AWS Production Account', type: 'cloud', category: 'cloud' },
    { name: 'AWS Development Account', type: 'cloud', category: 'cloud' },
    { name: 'GCP Analytics Project', type: 'cloud', category: 'cloud' },
  ],
};

// ============================================
// INTEGRATIONS (configured but not connected)
// ============================================
export const DEMO_INTEGRATIONS = [
  { type: 'aws', name: 'AWS Production', status: 'pending_setup' },
  { type: 'gcp', name: 'Google Cloud', status: 'pending_setup' },
  { type: 'okta', name: 'Okta SSO', status: 'pending_setup' },
  { type: 'github', name: 'GitHub Enterprise', status: 'pending_setup' },
  { type: 'jamf', name: 'Jamf Pro', status: 'pending_setup' },
  { type: 'knowbe4', name: 'KnowBe4', status: 'pending_setup' },
  { type: 'bamboohr', name: 'BambooHR', status: 'pending_setup' },
  { type: 'checkr', name: 'Checkr', status: 'pending_setup' },
  { type: 'datadog', name: 'Datadog', status: 'pending_setup' },
  { type: 'slack', name: 'Slack Workspace', status: 'pending_setup' },
];

// ============================================
// RISK SCENARIOS
// ============================================
export const DEMO_RISK_SCENARIOS = [
  {
    title: 'Phishing Attack Leading to Data Breach',
    description: 'A sophisticated spear-phishing campaign targets employees with access to sensitive customer data, potentially leading to unauthorized data exfiltration.',
    category: 'Data Breach',
    threatActor: 'external_attacker',
    attackVector: 'phishing',
    targetAssets: ['Email System', 'Customer Database', 'CRM'],
    likelihood: 'likely',
    impact: 'severe',
    tags: ['phishing', 'data-breach', 'employee-risk'],
    isTemplate: true,
    mitigationStrategy: 'Implement email filtering, security awareness training, MFA, and DLP solutions.',
    businessContext: 'Customer data breach could result in regulatory fines and reputational damage.',
    complianceImpact: 'GDPR Article 33, SOC 2 CC6.1',
  },
  {
    title: 'Ransomware Attack on Critical Infrastructure',
    description: 'Ransomware deployment through compromised credentials or unpatched systems leading to encryption of critical business systems.',
    category: 'System Compromise',
    threatActor: 'organized_crime',
    attackVector: 'malware',
    targetAssets: ['File Servers', 'Database Servers', 'Backup Systems'],
    likelihood: 'possible',
    impact: 'severe',
    tags: ['ransomware', 'business-continuity', 'critical'],
    isTemplate: true,
    mitigationStrategy: 'Maintain offline backups, implement EDR, regular patching, and network segmentation.',
    businessContext: 'Business interruption could cost $50K-$500K per day in lost revenue.',
    complianceImpact: 'SOC 2 CC7.2, ISO 27001 A.12.2',
  },
  {
    title: 'Insider Data Theft',
    description: 'Malicious insider with privileged access exfiltrates sensitive intellectual property or customer data before leaving the organization.',
    category: 'Data Breach',
    threatActor: 'insider_malicious',
    attackVector: 'insider_access',
    targetAssets: ['Source Code Repository', 'Customer Database', 'Financial Systems'],
    likelihood: 'possible',
    impact: 'major',
    tags: ['insider-threat', 'data-exfiltration', 'privileged-access'],
    isTemplate: true,
    mitigationStrategy: 'Implement DLP, user behavior analytics, access reviews, and exit procedures.',
    businessContext: 'IP theft could provide competitive advantage to rivals.',
    complianceImpact: 'SOC 2 CC6.3, ISO 27001 A.9.2.6',
  },
  {
    title: 'Third-Party Vendor Compromise',
    description: 'A critical SaaS vendor experiences a security breach that exposes data shared through their platform or provides attack vector into our systems.',
    category: 'Third Party Risk',
    threatActor: 'external_attacker',
    attackVector: 'supply_chain',
    targetAssets: ['Vendor Integrations', 'API Connections', 'Shared Data'],
    likelihood: 'possible',
    impact: 'major',
    tags: ['supply-chain', 'third-party', 'vendor-risk'],
    isTemplate: true,
    mitigationStrategy: 'Vendor security assessments, contract security requirements, continuous monitoring.',
    businessContext: 'Dependent on 15+ critical vendors with varying security maturity.',
    complianceImpact: 'SOC 2 CC9.2, ISO 27001 A.15.1',
  },
  {
    title: 'Cloud Infrastructure Misconfiguration',
    description: 'Misconfigured cloud storage, security groups, or IAM policies expose sensitive data or create unauthorized access paths.',
    category: 'Cloud Security',
    threatActor: 'insider_negligent',
    attackVector: 'web_application',
    targetAssets: ['AWS S3 Buckets', 'Cloud Databases', 'API Gateways'],
    likelihood: 'likely',
    impact: 'moderate',
    tags: ['cloud', 'misconfiguration', 'aws'],
    isTemplate: true,
    mitigationStrategy: 'CSPM tools, infrastructure as code reviews, automated compliance checks.',
    businessContext: 'Multi-cloud environment increases configuration complexity.',
    complianceImpact: 'SOC 2 CC6.1, CIS Benchmarks',
  },
  {
    title: 'DDoS Attack on Public Services',
    description: 'Distributed denial of service attack targeting public-facing applications and APIs, causing service unavailability.',
    category: 'Service Disruption',
    threatActor: 'hacktivist',
    attackVector: 'network',
    targetAssets: ['Web Application', 'API Gateway', 'CDN'],
    likelihood: 'likely',
    impact: 'moderate',
    tags: ['ddos', 'availability', 'network'],
    isTemplate: true,
    mitigationStrategy: 'DDoS protection services, CDN with DDoS mitigation, auto-scaling infrastructure.',
    businessContext: 'Public API serves 10K+ daily active users.',
    complianceImpact: 'SOC 2 A1.1, SLA Commitments',
  },
  {
    title: 'API Security Vulnerability Exploitation',
    description: 'Attackers exploit vulnerabilities in exposed APIs (broken authentication, injection, excessive data exposure) to access or manipulate data.',
    category: 'System Compromise',
    threatActor: 'external_attacker',
    attackVector: 'api',
    targetAssets: ['REST APIs', 'GraphQL Endpoints', 'Mobile Backend'],
    likelihood: 'possible',
    impact: 'major',
    tags: ['api-security', 'owasp', 'application-security'],
    isTemplate: true,
    mitigationStrategy: 'API gateway, rate limiting, input validation, security testing in CI/CD.',
    businessContext: 'APIs handle 5M+ requests daily with sensitive data.',
    complianceImpact: 'SOC 2 CC6.1, OWASP API Top 10',
  },
  {
    title: 'Credential Stuffing Attack',
    description: 'Automated attacks using leaked credential databases to gain unauthorized access to user accounts through credential reuse.',
    category: 'Data Breach',
    threatActor: 'external_attacker',
    attackVector: 'brute_force',
    targetAssets: ['User Authentication', 'Customer Accounts', 'Admin Portal'],
    likelihood: 'almost_certain',
    impact: 'moderate',
    tags: ['credential-stuffing', 'account-takeover', 'authentication'],
    isTemplate: true,
    mitigationStrategy: 'MFA enforcement, rate limiting, password breach detection, CAPTCHA.',
    businessContext: '50K+ user accounts with varying password hygiene.',
    complianceImpact: 'SOC 2 CC6.1, NIST 800-63',
  },
  {
    title: 'Social Engineering of Privileged Users',
    description: 'Targeted social engineering attacks against IT administrators or executives to gain access to privileged systems or approve fraudulent transactions.',
    category: 'Financial Fraud',
    threatActor: 'organized_crime',
    attackVector: 'social_engineering',
    targetAssets: ['Admin Accounts', 'Financial Systems', 'Wire Transfer Processes'],
    likelihood: 'possible',
    impact: 'severe',
    tags: ['social-engineering', 'bec', 'executive-fraud'],
    isTemplate: true,
    mitigationStrategy: 'Verification procedures for financial transactions, security awareness training, out-of-band confirmation.',
    businessContext: 'Finance team processes $10M+ in monthly transactions.',
    complianceImpact: 'SOC 2 CC5.2, SOX Controls',
  },
  {
    title: 'Physical Security Breach',
    description: 'Unauthorized physical access to office or data center facilities leading to device theft or direct system access.',
    category: 'Physical Security',
    threatActor: 'external_attacker',
    attackVector: 'physical',
    targetAssets: ['Workstations', 'Network Equipment', 'Server Room'],
    likelihood: 'unlikely',
    impact: 'moderate',
    tags: ['physical-security', 'theft', 'on-premise'],
    isTemplate: true,
    mitigationStrategy: 'Access controls, surveillance, visitor management, device encryption.',
    businessContext: 'Hybrid work model with multiple office locations.',
    complianceImpact: 'ISO 27001 A.11, SOC 2 CC6.4',
  },
  {
    title: 'AI/ML Model Poisoning',
    description: 'Adversarial manipulation of training data or model inputs to cause incorrect outputs or expose sensitive information through model inversion.',
    category: 'AI/ML Risk',
    threatActor: 'nation_state',
    attackVector: 'api',
    targetAssets: ['ML Models', 'Training Pipelines', 'Prediction APIs'],
    likelihood: 'unlikely',
    impact: 'major',
    tags: ['ai-security', 'adversarial-ml', 'emerging-threats'],
    isTemplate: true,
    mitigationStrategy: 'Input validation, model monitoring, adversarial testing, data provenance.',
    businessContext: 'ML models used for fraud detection and customer recommendations.',
    complianceImpact: 'NIST AI RMF, EU AI Act',
  },
  {
    title: 'Remote Work Security Incident',
    description: 'Security incident stemming from insecure home networks, personal devices, or lack of physical security in remote work environments.',
    category: 'Remote Work',
    threatActor: 'insider_negligent',
    attackVector: 'network',
    targetAssets: ['VPN', 'Remote Endpoints', 'Cloud Applications'],
    likelihood: 'likely',
    impact: 'minor',
    tags: ['remote-work', 'endpoint-security', 'byod'],
    isTemplate: true,
    mitigationStrategy: 'VPN enforcement, EDR on all endpoints, zero trust architecture.',
    businessContext: '70% of workforce operates remotely or hybrid.',
    complianceImpact: 'SOC 2 CC6.1, ISO 27001 A.6.2.2',
  },
];

// ============================================
// AUDITS
// ============================================
export const DEMO_AUDITS = [
  {
    name: 'SOC 2 Type II 2024',
    type: 'soc2_type2',
    status: 'completed',
    startDate: new Date('2024-09-01'),
    endDate: new Date('2024-11-15'),
    auditor: 'Deloitte',
    result: 'unqualified',
  },
  {
    name: 'ISO 27001 Certification',
    type: 'iso27001',
    status: 'in_progress',
    startDate: new Date('2025-01-15'),
    endDate: new Date('2025-04-30'),
    auditor: 'BSI',
  },
  {
    name: 'Internal Security Review Q1 2025',
    type: 'internal',
    status: 'in_progress',
    startDate: new Date('2025-01-01'),
    endDate: new Date('2025-03-31'),
    auditor: 'Internal Audit Team',
  },
  {
    name: 'Penetration Test 2025',
    type: 'pentest',
    status: 'scheduled',
    startDate: new Date('2025-02-01'),
    endDate: new Date('2025-02-15'),
    auditor: 'NCC Group',
  },
  {
    name: 'SOC 2 Type II 2025',
    type: 'soc2_type2',
    status: 'scheduled',
    startDate: new Date('2025-09-01'),
    endDate: new Date('2025-11-15'),
    auditor: 'Deloitte',
  },
];

// Export all generators
export const generators = {
  generateEmployees,
  DEMO_FRAMEWORKS,
  DEMO_CONTROLS,
  DEMO_POLICIES,
  DEMO_VENDORS,
  DEMO_RISKS,
  DEMO_RISK_SCENARIOS,
  DEMO_TRAINING_COURSES,
  DEMO_ASSET_TYPES,
  DEMO_INTEGRATIONS,
  DEMO_AUDITS,
};

