/**
 * Built-in Exercise Template Library
 *
 * Pre-built tabletop exercise scenarios for common BC/DR situations.
 * These are global templates available to all organizations.
 */

export interface ExerciseTemplateData {
  id: string;
  templateId: string;
  title: string;
  description: string;
  category: string;
  scenarioType: string;
  scenarioNarrative: string;
  discussionQuestions: DiscussionQuestion[];
  injects: ScenarioInject[];
  expectedDecisions: string[];
  facilitatorNotes: string;
  estimatedDuration: number;
  participantRoles: ParticipantRole[];
  tags: string[];
}

export interface DiscussionQuestion {
  id: string;
  question: string;
  category: string;
  timing?: string;
  expectedResponses?: string[];
}

export interface ScenarioInject {
  id: string;
  timing: string;
  title: string;
  description: string;
  expectedActions?: string[];
}

export interface ParticipantRole {
  role: string;
  description: string;
  required: boolean;
}

export const EXERCISE_TEMPLATE_LIBRARY: ExerciseTemplateData[] = [
  // ============================================
  // RANSOMWARE ATTACK
  // ============================================
  {
    id: 'lib-exercise-001',
    templateId: 'TTX-RANSOMWARE-001',
    title: 'Ransomware Attack Tabletop Exercise',
    description: 'A simulated ransomware attack affecting critical business systems, requiring incident response, recovery decisions, and stakeholder communication.',
    category: 'ransomware',
    scenarioType: 'tabletop',
    scenarioNarrative: `It's Monday morning at 8:30 AM. Your IT team receives multiple alerts about unusual file activity across several servers. Within 15 minutes, employees report they cannot access shared drives and are seeing ransom notes on their screens.

Initial assessment reveals:
- File servers showing encrypted files with .locked extension
- Ransom note demanding 50 Bitcoin (approximately $2.5M) within 72 hours
- Active Directory appears compromised
- Email servers are partially affected
- Customer-facing systems are still operational but internal systems are impacted

The ransomware appears to have spread through a phishing email opened by an employee in the finance department three days ago.`,
    discussionQuestions: [
      {
        id: 'q1',
        question: 'What are the immediate actions we should take in the first 30 minutes?',
        category: 'Initial Response',
        expectedResponses: ['Isolate affected systems', 'Preserve evidence', 'Notify incident response team', 'Assess scope of impact'],
      },
      {
        id: 'q2',
        question: 'Who needs to be notified internally and externally? What is our communication strategy?',
        category: 'Communication',
        expectedResponses: ['Executive team', 'Legal counsel', 'Cyber insurance carrier', 'Law enforcement consideration'],
      },
      {
        id: 'q3',
        question: 'Should we pay the ransom? What factors influence this decision?',
        category: 'Decision Making',
        expectedResponses: ['Backup availability', 'Legal implications', 'Insurance coverage', 'Business impact of extended downtime'],
      },
      {
        id: 'q4',
        question: 'How do we recover our systems? What is our priority order?',
        category: 'Recovery',
        expectedResponses: ['Critical systems first', 'Verify backup integrity', 'Rebuild vs restore', 'Security hardening before restoration'],
      },
      {
        id: 'q5',
        question: 'What are our regulatory notification requirements?',
        category: 'Compliance',
        expectedResponses: ['Breach notification timeline', 'Customer notification', 'Regulatory bodies to notify'],
      },
    ],
    injects: [
      {
        id: 'i1',
        timing: '30 minutes',
        title: 'Media Inquiry',
        description: 'A local news outlet has received a tip about the attack and is asking for comment. Your PR team needs guidance on how to respond.',
        expectedActions: ['Coordinate with legal', 'Prepare holding statement', 'Designate spokesperson'],
      },
      {
        id: 'i2',
        timing: '1 hour',
        title: 'Backup Status',
        description: 'Your IT team reports that while offline backups exist, the most recent backup is 5 days old. The last 5 days of data may be lost if you restore from backup.',
        expectedActions: ['Assess data loss impact', 'Evaluate alternatives', 'Communicate with business units'],
      },
      {
        id: 'i3',
        timing: '2 hours',
        title: 'Threat Actor Contact',
        description: 'The threat actor reaches out offering to decrypt a sample file as proof of capability and reduces their demand to 30 Bitcoin if paid within 24 hours.',
        expectedActions: ['Document communication', 'Consult with FBI/law enforcement', 'Continue recovery efforts'],
      },
    ],
    expectedDecisions: [
      'Establish incident command structure',
      'Determine ransom payment position',
      'Prioritize system recovery order',
      'Approve external communications',
      'Engage third-party incident response if needed',
    ],
    facilitatorNotes: `This exercise tests the organization's ransomware response capabilities. Key areas to observe:
- Speed of decision-making under pressure
- Clarity of roles and responsibilities
- Communication effectiveness
- Balance between technical recovery and business continuity
- Understanding of regulatory requirements

Allow participants to debate the ransom payment decision - there is no single correct answer. Focus on the process and considerations rather than the outcome.`,
    estimatedDuration: 120,
    participantRoles: [
      { role: 'Executive Sponsor', description: 'Makes final decisions on major actions', required: true },
      { role: 'IT Lead', description: 'Provides technical assessment and recovery options', required: true },
      { role: 'Legal Counsel', description: 'Advises on regulatory and legal implications', required: true },
      { role: 'Communications/PR', description: 'Manages internal and external messaging', required: true },
      { role: 'Business Unit Leaders', description: 'Represent affected departments', required: false },
      { role: 'HR Representative', description: 'Handles employee-related concerns', required: false },
    ],
    tags: ['ransomware', 'cyber', 'critical', 'incident-response'],
  },

  // ============================================
  // DATA CENTER / CLOUD FAILURE
  // ============================================
  {
    id: 'lib-exercise-002',
    templateId: 'TTX-DATACENTER-001',
    title: 'Data Center / Cloud Region Failure',
    description: 'A major cloud provider experiences a regional outage affecting your primary infrastructure. Tests cloud recovery procedures and multi-region failover capabilities.',
    category: 'infrastructure',
    scenarioType: 'tabletop',
    scenarioNarrative: `At 2:00 PM on a Wednesday, your monitoring systems detect widespread service degradation. Within 10 minutes, your cloud provider (AWS/Azure/GCP) confirms a major incident affecting your primary region.

Situation:
- All services in us-east-1 are unavailable
- Estimated time to restoration is "unknown" per cloud provider
- Your DR region (us-west-2) has infrastructure provisioned but limited testing
- Customer-facing applications are down
- Internal tools including email are partially affected
- Your last successful DR test was 8 months ago

Customer impact is immediate - support calls are flooding in, and social media is lighting up with complaints.`,
    discussionQuestions: [
      {
        id: 'q1',
        question: 'Do we failover to our DR region? What factors influence this decision?',
        category: 'Decision Making',
        expectedResponses: ['Estimated outage duration', 'DR region readiness', 'Data consistency concerns', 'Cost of failover vs waiting'],
      },
      {
        id: 'q2',
        question: 'What is our customer communication strategy during the outage?',
        category: 'Communication',
        expectedResponses: ['Status page updates', 'Proactive customer notification', 'Social media response', 'Support team messaging'],
      },
      {
        id: 'q3',
        question: 'What data might we lose or have inconsistencies with if we failover now?',
        category: 'Data Integrity',
        expectedResponses: ['RPO assessment', 'Transaction reconciliation', 'Database replication lag'],
      },
      {
        id: 'q4',
        question: 'How do we handle SLA commitments and customer credits?',
        category: 'Business',
        expectedResponses: ['SLA tracking', 'Credit calculation', 'Customer retention considerations'],
      },
    ],
    injects: [
      {
        id: 'i1',
        timing: '30 minutes',
        title: 'Cloud Provider Update',
        description: 'Cloud provider updates their status page: "We have identified the root cause and are working on remediation. Estimated time to recovery: 4-6 hours."',
        expectedActions: ['Reassess failover decision', 'Update stakeholders', 'Continue monitoring'],
      },
      {
        id: 'i2',
        timing: '1 hour',
        title: 'Major Customer Escalation',
        description: 'Your largest enterprise customer contacts their executive sponsor demanding an update. They are threatening contract termination.',
        expectedActions: ['Executive-to-executive communication', 'Provide recovery timeline', 'Discuss compensation'],
      },
    ],
    expectedDecisions: [
      'Failover vs wait decision with timeline',
      'Customer communication cadence',
      'Resource allocation for recovery',
      'Post-incident review scheduling',
    ],
    facilitatorNotes: `Focus on the decision-making process around failover. Key tensions to explore:
- Speed of recovery vs data integrity
- Cost of extended outage vs risk of failed failover
- Customer communication timing and messaging

This exercise often reveals gaps in DR testing frequency and documentation.`,
    estimatedDuration: 90,
    participantRoles: [
      { role: 'IT/Infrastructure Lead', description: 'Leads technical recovery decisions', required: true },
      { role: 'Business Leader', description: 'Represents business impact and priorities', required: true },
      { role: 'Customer Success/Support', description: 'Manages customer communication', required: true },
      { role: 'Executive Sponsor', description: 'Approves major decisions', required: true },
    ],
    tags: ['cloud', 'infrastructure', 'disaster-recovery', 'outage'],
  },

  // ============================================
  // CRITICAL VENDOR OUTAGE
  // ============================================
  {
    id: 'lib-exercise-003',
    templateId: 'TTX-VENDOR-001',
    title: 'Critical Vendor/SaaS Outage',
    description: 'A business-critical SaaS vendor experiences an extended outage, testing your vendor management and workaround procedures.',
    category: 'vendor_outage',
    scenarioType: 'tabletop',
    scenarioNarrative: `Your organization relies on a critical SaaS platform for core operations (e.g., Salesforce, Workday, ServiceNow). At 9:00 AM, the vendor's status page shows a major incident.

Situation:
- The vendor reports "degraded performance" but users report complete unavailability
- Your sales team cannot access customer data or update opportunities
- Support tickets cannot be created or updated
- The vendor's support line has 2+ hour wait times
- Your contract SLA guarantees 99.9% uptime

After 2 hours, the vendor updates: "We are experiencing a critical database issue. We are working with our highest priority to resolve. No ETA at this time."`,
    discussionQuestions: [
      {
        id: 'q1',
        question: 'What manual workarounds can we implement for critical processes?',
        category: 'Continuity',
        expectedResponses: ['Spreadsheet-based tracking', 'Email-based workflows', 'Phone/paper processes'],
      },
      {
        id: 'q2',
        question: 'How do we communicate with customers who are expecting updates from us?',
        category: 'Communication',
        expectedResponses: ['Proactive outreach', 'Set expectations', 'Alternative contact methods'],
      },
      {
        id: 'q3',
        question: 'What is our escalation path with the vendor? What leverage do we have?',
        category: 'Vendor Management',
        expectedResponses: ['Executive contacts', 'Contract terms', 'SLA credits', 'Alternative vendor consideration'],
      },
    ],
    injects: [
      {
        id: 'i1',
        timing: '3 hours',
        title: 'Potential Data Loss',
        description: 'The vendor announces they may need to restore from backup. Data entered in the last 4 hours may be lost.',
        expectedActions: ['Document recent entries', 'Prepare for data reconciliation', 'Communicate with affected users'],
      },
    ],
    expectedDecisions: [
      'Implement workaround procedures',
      'Customer communication approach',
      'Vendor escalation strategy',
      'Post-incident vendor review',
    ],
    facilitatorNotes: `This exercise highlights vendor dependency risks. Explore:
- Adequacy of vendor contingency planning
- Documentation of manual workarounds
- Vendor contract and SLA understanding
- Need for alternative vendor evaluation`,
    estimatedDuration: 75,
    participantRoles: [
      { role: 'Business Process Owner', description: 'Knows the affected workflows', required: true },
      { role: 'IT/Vendor Manager', description: 'Manages vendor relationship', required: true },
      { role: 'Operations Lead', description: 'Implements workarounds', required: true },
    ],
    tags: ['vendor', 'saas', 'third-party', 'outage'],
  },

  // ============================================
  // NATURAL DISASTER
  // ============================================
  {
    id: 'lib-exercise-004',
    templateId: 'TTX-NATDISASTER-001',
    title: 'Natural Disaster - Facility Inaccessibility',
    description: 'A natural disaster makes your primary facility inaccessible, requiring activation of remote work and alternate site procedures.',
    category: 'natural_disaster',
    scenarioType: 'tabletop',
    scenarioNarrative: `A major storm system is forecast to impact your region. Weather services are predicting:
- Severe flooding in the area around your main office
- Power outages expected to last 3-5 days
- Road closures making office access impossible
- Cell tower impacts affecting mobile communication

You have 24 hours before the storm arrives. Your office will likely be inaccessible for 5-7 days minimum, with potential building damage.

Current situation:
- 60% of employees typically work from the office
- Some employees have company laptops; others use desktops
- Your server room has backup power for 4 hours
- Critical documents are stored both digitally and in file cabinets`,
    discussionQuestions: [
      {
        id: 'q1',
        question: 'What actions should we take in the next 24 hours before the storm?',
        category: 'Preparation',
        expectedResponses: ['Secure physical assets', 'Enable remote access', 'Back up critical data', 'Employee communication'],
      },
      {
        id: 'q2',
        question: 'How do we ensure all employees can work remotely?',
        category: 'Remote Work',
        expectedResponses: ['Equipment distribution', 'VPN access', 'Communication tools', 'Home office setup'],
      },
      {
        id: 'q3',
        question: 'What are our critical functions that must continue? How do we prioritize?',
        category: 'Prioritization',
        expectedResponses: ['Customer-facing operations', 'Payroll/HR', 'Security monitoring', 'Critical deadlines'],
      },
      {
        id: 'q4',
        question: 'How do we account for employee safety and wellbeing?',
        category: 'Employee Care',
        expectedResponses: ['Check-in procedures', 'Emergency contacts', 'Flexibility for those affected', 'Mental health support'],
      },
    ],
    injects: [
      {
        id: 'i1',
        timing: 'Day 2',
        title: 'Building Damage Report',
        description: 'Initial reports indicate water damage to the ground floor. Server room was affected. Extent of damage unknown.',
        expectedActions: ['Assess data loss', 'Engage insurance', 'Plan extended remote work'],
      },
      {
        id: 'i2',
        timing: 'Day 3',
        title: 'Employee Emergency',
        description: 'An employee reports they have been displaced from their home and cannot work. Two others report power outages with no timeline for restoration.',
        expectedActions: ['Provide support', 'Adjust work expectations', 'Identify backup resources'],
      },
    ],
    expectedDecisions: [
      'Pre-storm preparation checklist',
      'Remote work activation',
      'Employee safety procedures',
      'Business continuity priorities',
      'Return-to-office criteria',
    ],
    facilitatorNotes: `Natural disaster scenarios test both business continuity and employee care. Balance discussion between:
- Operational continuity
- Employee safety and wellbeing
- Physical asset protection
- Long-term recovery planning

This scenario works well for organizations in disaster-prone areas.`,
    estimatedDuration: 90,
    participantRoles: [
      { role: 'Facilities Manager', description: 'Building and physical assets', required: true },
      { role: 'HR Lead', description: 'Employee welfare and communication', required: true },
      { role: 'IT Lead', description: 'Technology and remote work enablement', required: true },
      { role: 'Operations Lead', description: 'Business continuity', required: true },
    ],
    tags: ['natural-disaster', 'remote-work', 'facility', 'weather'],
  },

  // ============================================
  // PANDEMIC RESPONSE
  // ============================================
  {
    id: 'lib-exercise-005',
    templateId: 'TTX-PANDEMIC-001',
    title: 'Pandemic / Workforce Unavailability',
    description: 'A health crisis causes significant workforce unavailability, requiring extended remote operations and staffing contingencies.',
    category: 'pandemic',
    scenarioType: 'tabletop',
    scenarioNarrative: `A new respiratory illness is spreading rapidly. Health authorities have issued guidance for organizations to prepare for:
- 30-40% workforce absenteeism at peak
- Potential office closures or capacity restrictions
- Supply chain disruptions
- Extended duration of 3-6 months

Week 1:
- 15% of your workforce is already ill or caring for sick family members
- Remaining employees are anxious about coming to the office
- Customers are asking about your continuity plans
- Your supply chain vendors are warning of potential disruptions`,
    discussionQuestions: [
      {
        id: 'q1',
        question: 'What are our essential functions and minimum staffing requirements?',
        category: 'Critical Operations',
        expectedResponses: ['Identify critical roles', 'Cross-training needs', 'Minimum viable operations'],
      },
      {
        id: 'q2',
        question: 'How do we handle extended remote work for months rather than days?',
        category: 'Remote Operations',
        expectedResponses: ['Technology needs', 'Collaboration tools', 'Performance management', 'Culture maintenance'],
      },
      {
        id: 'q3',
        question: 'What policies need to be created or modified for this situation?',
        category: 'Policy',
        expectedResponses: ['Sick leave', 'Remote work', 'Travel restrictions', 'Workplace safety'],
      },
    ],
    injects: [
      {
        id: 'i1',
        timing: 'Week 2',
        title: 'Key Person Illness',
        description: 'Your IT Director and two senior developers are all ill simultaneously. They hold critical knowledge about system maintenance.',
        expectedActions: ['Activate succession plan', 'Document knowledge gaps', 'Prioritize recovery'],
      },
    ],
    expectedDecisions: [
      'Remote work policy',
      'Essential personnel identification',
      'Succession planning gaps',
      'Customer communication',
      'Supply chain alternatives',
    ],
    facilitatorNotes: `Post-COVID, organizations have more pandemic experience. Focus on:
- What worked and didn't work during COVID
- Documentation and succession gaps
- Mental health and burnout considerations
- Sustainable long-term remote work`,
    estimatedDuration: 90,
    participantRoles: [
      { role: 'HR Lead', description: 'Workforce and policy decisions', required: true },
      { role: 'Operations Lead', description: 'Business continuity', required: true },
      { role: 'IT Lead', description: 'Remote work enablement', required: true },
      { role: 'Executive Sponsor', description: 'Strategic decisions', required: true },
    ],
    tags: ['pandemic', 'remote-work', 'workforce', 'health'],
  },

  // ============================================
  // DATA BREACH
  // ============================================
  {
    id: 'lib-exercise-006',
    templateId: 'TTX-BREACH-001',
    title: 'Data Breach - Customer Data Exposed',
    description: 'Discovery of unauthorized access to customer data, requiring breach response, notification, and regulatory compliance.',
    category: 'data_breach',
    scenarioType: 'tabletop',
    scenarioNarrative: `Your security team discovers evidence that an unauthorized party accessed your customer database approximately 2 weeks ago. Initial investigation reveals:

- Approximately 50,000 customer records were accessed
- Data includes names, email addresses, and encrypted passwords
- No financial data (credit cards) appears to be affected
- Access occurred through a compromised API key
- The breach was discovered through unusual API usage patterns

You are now 4 hours into the investigation. The extent may grow as investigation continues.`,
    discussionQuestions: [
      {
        id: 'q1',
        question: 'What is our regulatory notification timeline and requirements?',
        category: 'Compliance',
        expectedResponses: ['GDPR 72-hour requirement', 'State breach notification laws', 'Industry-specific requirements'],
      },
      {
        id: 'q2',
        question: 'When and how do we notify affected customers?',
        category: 'Customer Communication',
        expectedResponses: ['Timing considerations', 'Communication channels', 'Support resources', 'Identity protection offers'],
      },
      {
        id: 'q3',
        question: 'What immediate technical actions are needed?',
        category: 'Technical Response',
        expectedResponses: ['Revoke compromised credentials', 'Preserve evidence', 'Assess attack vector', 'Patch vulnerabilities'],
      },
      {
        id: 'q4',
        question: 'What are our legal and liability considerations?',
        category: 'Legal',
        expectedResponses: ['Cyber insurance notification', 'Legal counsel engagement', 'Documentation for defense'],
      },
    ],
    injects: [
      {
        id: 'i1',
        timing: 'Day 2',
        title: 'Expanded Scope',
        description: 'Investigation reveals the breach is larger than initially thought. 150,000 records were accessed, and some included partial Social Security numbers.',
        expectedActions: ['Update notification plans', 'Consider credit monitoring', 'Revise communications'],
      },
      {
        id: 'i2',
        timing: 'Day 3',
        title: 'Media Coverage',
        description: 'A security researcher has tweeted about the breach after finding exposed data on a dark web forum. Media inquiries are coming in.',
        expectedActions: ['Coordinate response', 'Accelerate notifications', 'Prepare press statement'],
      },
    ],
    expectedDecisions: [
      'Breach notification timeline',
      'Customer communication approach',
      'Remediation services offered',
      'Technical remediation plan',
      'Regulatory notifications',
    ],
    facilitatorNotes: `Data breach exercises require balancing speed with accuracy. Key points:
- Regulatory timelines are strict (GDPR 72 hours)
- Customer trust is at stake
- Legal implications are significant
- Communication tone and timing matter greatly

Explore the tension between quick notification and complete information.`,
    estimatedDuration: 120,
    participantRoles: [
      { role: 'Security Lead', description: 'Technical investigation and remediation', required: true },
      { role: 'Legal Counsel', description: 'Regulatory and legal guidance', required: true },
      { role: 'Communications/PR', description: 'Customer and media communication', required: true },
      { role: 'Executive Sponsor', description: 'Final decisions and approvals', required: true },
      { role: 'Privacy Officer', description: 'Regulatory compliance', required: false },
    ],
    tags: ['data-breach', 'cyber', 'privacy', 'compliance', 'notification'],
  },
];
