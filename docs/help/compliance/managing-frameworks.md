# Managing Compliance Frameworks

Compliance frameworks define the requirements and controls your organization must implement. GigaChad GRC supports all major compliance frameworks with pre-built control mappings.

## Supported Frameworks

### Security & Privacy

| Framework     | Description                     | Common For                        |
| ------------- | ------------------------------- | --------------------------------- |
| SOC 2 Type II | Service organization controls   | SaaS companies, service providers |
| ISO 27001     | Information security management | Global organizations              |
| NIST CSF      | Cybersecurity framework         | US federal contractors            |
| NIST 800-53   | Federal security controls       | Government contractors            |
| CIS Controls  | Critical security controls      | All organizations                 |

### Industry-Specific

| Framework | Description                 | Common For                         |
| --------- | --------------------------- | ---------------------------------- |
| HIPAA     | Health data protection      | Healthcare, health tech            |
| PCI DSS   | Payment card security       | E-commerce, fintech                |
| GDPR      | EU data privacy             | Organizations handling EU data     |
| CCPA      | California consumer privacy | Organizations serving CA residents |
| SOX       | Financial controls          | Public companies                   |

### Emerging Standards

| Framework  | Description                  | Common For               |
| ---------- | ---------------------------- | ------------------------ |
| SOC 2 + AI | AI-specific trust principles | AI/ML companies          |
| FedRAMP    | Federal cloud security       | Cloud service providers  |
| StateRAMP  | State-level cloud security   | State government vendors |

## Adding a Framework

### Step 1: Choose Your Framework

1. Navigate to **Frameworks**
2. Click **Add Framework**
3. Browse or search for your framework
4. Click **Select**

### Step 2: Review Default Settings

Each framework comes with:

- **Requirements**: Individual compliance requirements
- **Control Mappings**: Suggested controls for each requirement
- **Scoring Model**: How readiness is calculated

Review and adjust as needed for your organization.

### Step 3: Activate Framework

1. Click **Activate Framework**
2. Framework appears in your active frameworks list
3. Controls are automatically mapped

## Framework Dashboard

Each framework has a dedicated dashboard showing:

### Readiness Score

A percentage indicating overall compliance readiness:

- **90-100%**: Audit-ready
- **70-89%**: Good progress, minor gaps
- **50-69%**: Significant work needed
- **Below 50%**: Major gaps to address

### Requirement Status

Visual breakdown of requirements:

- ✅ **Met**: All mapped controls implemented
- 🔄 **In Progress**: Controls partially implemented
- ❌ **Not Met**: No controls implemented
- ⚪ **Not Applicable**: Explicitly marked N/A

### Gap Analysis

Identifies:

- Missing controls
- Evidence gaps
- Documentation needs

For mapping-specific coverage percentages and the cross-framework gap report, see [Mapping Coverage and Gap Analysis](mapping-coverage-and-gaps.md).

## Mapping Controls to Frameworks

Controls can be mapped to multiple frameworks simultaneously.

### Automatic Mapping

When you activate a framework:

1. System suggests control mappings based on standard mappings
2. Existing controls are matched by ID and category
3. Review and approve suggested mappings

### Manual Mapping

1. Open a control
2. Go to **Framework Mappings** tab
3. Click **Add Mapping**
4. Select the framework and requirement
5. Save

### Bulk Mapping

1. Go to **Frameworks** → [Your Framework]
2. Click **Bulk Mapping**
3. Upload a CSV with control-to-requirement mappings
4. Review and confirm

## Multi-Framework Compliance

Many controls satisfy multiple frameworks:

```
Control: MFA-001 - Require MFA for all users

Satisfies:
├── SOC 2 CC6.1 - Logical access security
├── ISO 27001 A.9.4.2 - Secure log-on procedures
├── NIST CSF PR.AC-7 - Authentication
└── HIPAA §164.312(d) - Person authentication
```

### Benefits

- Implement once, satisfy many
- Reduce audit preparation time
- Unified view of compliance status

### Viewing Cross-Framework Impact

1. Open any control
2. Check **Framework Mappings** section
3. See all requirements this control satisfies

## Preparing for Audits

### Audit Readiness Checklist

For each framework:

- [ ] All requirements have mapped controls
- [ ] All controls have evidence
- [ ] Evidence is current (within validity period)
- [ ] Policies are published and acknowledged
- [ ] Risk assessments are documented

### Generating Audit Reports

1. Go to **Frameworks** → [Your Framework]
2. Click **Generate Report**
3. Select report type:
   - **Executive Summary**: High-level overview
   - **Detailed Report**: Full evidence package
   - **Gap Report**: Outstanding items only
4. Download or share with auditors

## Framework Best Practices

### Start Simple

1. Begin with your primary framework (usually SOC 2 or ISO 27001)
2. Achieve strong compliance baseline
3. Add additional frameworks as needed

### Maintain Continuously

- Don't treat compliance as a one-time project
- Schedule regular reviews (monthly recommended)
- Keep evidence fresh and controls updated

### Leverage Automation

- Connect integrations for automated evidence collection
- Use scheduled evidence refresh
- Set up alerts for expiring evidence

## Need Help?

- Review our [framework-specific guides](/help/frameworks/)
- Contact your compliance advisor
- Email support@example.com

---

_Last updated: December 2025_
