# Policies & Procedures

Policies define your organization's rules and standards for security and compliance. This guide covers managing policies, tracking reviews, and maintaining version control.

## Overview

The Policies module helps you:
- Create and store policy documents
- Track policy versions and approvals
- Schedule periodic reviews
- Map policies to controls and frameworks
- Distribute policies to stakeholders

## Policy Types

| Type | Description | Example |
|------|-------------|---------|
| **Policy** | High-level governance document | Information Security Policy |
| **Standard** | Specific requirements | Password Standard |
| **Procedure** | Step-by-step instructions | Incident Response Procedure |
| **Guideline** | Best practice recommendations | Remote Work Guidelines |

## Viewing Policies

Navigate to **Data → Policies** to see all policies:

### Filters
- **Status**: Draft, Published, Archived
- **Category**: Security domain
- **Owner**: Policy owner
- **Review Status**: Current, Due, Overdue

### Columns
- Policy ID and title
- Version number
- Status
- Owner
- Last reviewed date
- Next review date

## Creating a Policy

### From Scratch
1. Click **Create Policy**
2. Enter basic information:
   - **Policy ID**: Unique identifier (e.g., POL-001)
   - **Title**: Policy name
   - **Category**: Security domain
   - **Owner**: Responsible person
3. Write or paste policy content:
   - Use the rich text editor
   - Or upload a document (Word, PDF)
4. Set review schedule:
   - **Review Frequency**: Annual, Semi-Annual, etc.
   - **Next Review Date**: When to review
5. Click **Save as Draft** or **Publish**

### From Template (via AI Assistant)
Policy templates are available through the AI Assistant:
1. Open the AI Assistant
2. Ask to draft a policy (e.g., "Draft an Information Security Policy")
3. The AI uses pre-built templates to generate content
4. Review and customize the generated content
5. Copy into a new policy
6. Save and publish

> **Note**: A direct "Use Template" button in the policy creation UI is planned for a future release. Currently, templates are accessed via the AI Assistant.

## Policy Lifecycle

```
┌─────────┐    ┌──────────┐    ┌───────────┐    ┌──────────┐
│  Draft  │───▶│ In Review│───▶│ Published │───▶│ Archived │
└─────────┘    └──────────┘    └───────────┘    └──────────┘
     │              │               │
     └──────────────┴───────────────┘
           (Revision cycle)
```

### Statuses

| Status | Description |
|--------|-------------|
| **Draft** | Work in progress, not visible to users |
| **In Review** | Awaiting approval |
| **Published** | Active and visible |
| **Archived** | Superseded or no longer applicable |

## Version Control

Every policy maintains a complete version history:

### Creating a New Version
1. Open the published policy
2. Click **Create New Version**
3. Make your changes
4. Increment version number
5. Submit for review/approval
6. Publish the new version

### Viewing History
1. Open any policy
2. Go to **Version History** tab
3. See all previous versions
4. Download or compare versions

### Comparison
1. Click **Compare Versions**
2. Select two versions
3. View side-by-side differences

## Review Process

### Schedule Reviews
When creating a policy, set:
- **Review Frequency**: How often to review
- **Next Review Date**: Target date
- **Reviewers**: Who should review

### Review Workflow
1. **Notification**: Reviewers receive reminder
2. **Review**: Reviewers read the policy
3. **Feedback**: Submit comments or approve
4. **Update**: Owner makes changes if needed
5. **Publish**: Finalize the reviewed version

### Overdue Reviews
- Dashboard shows overdue policies
- Automatic notifications to owners
- Risk escalation for extended overdue

## Approvals

### Approval Workflow
1. Policy owner submits for approval
2. Designated approvers receive notification
3. Approvers review and approve/reject
4. Upon approval, policy is published

### Multi-Level Approval
Configure approval chains:
- Department head first
- Then legal review
- Finally executive approval

## Policy Distribution

### Acknowledgment
Track employee policy acknowledgments:
1. Open policy detail
2. View acknowledgment status in the **Acknowledgment** section
3. See which employees have acknowledged
4. Track completion rates

> **Note**: The ability to send acknowledgment requests directly from the policy page is planned for a future release. Currently, acknowledgment tracking is managed through the Employee Compliance module.

### Employee Access
Employees can view published policies:
- Through the main platform
- Via the Trust Center (if enabled)
- Through employee compliance module

## Mapping Policies

### To Controls
Link policies to the controls they govern:
1. Open policy detail
2. Go to **Linked Controls** tab
3. Click **Link Control**
4. Select relevant controls

### To Frameworks
Show which framework requirements a policy addresses:
1. Go to **Framework Mappings** tab
2. Click **Add Mapping**
3. Select framework and requirement

## Policy Templates

### Pre-Built Templates
GigaChad GRC includes templates for:
- Information Security Policy
- Acceptable Use Policy
- Data Classification Policy
- Data Retention Policy
- Incident Response Policy
- Access Control Policy
- Password Policy
- Remote Work Policy
- BYOD Policy
- Vendor Management Policy

### Custom Templates
Custom template creation is planned for a future release. Currently, you can:
- Use pre-built templates via the AI Assistant
- Copy existing policies as a starting point for new ones

## Search and Export

### Search
Find policies by:
- Title or content
- Category
- Owner
- Tags

### Export
1. Select policies (or select all)
2. Click **Export**
3. Choose format:
   - PDF (formatted)
   - Word (editable)
   - CSV (metadata only)

## Best Practices

### Writing Effective Policies
- Use clear, concise language
- Define scope and applicability
- Include enforcement section
- Reference related policies
- Avoid technical jargon

### Maintenance
- Review annually at minimum
- Update for regulatory changes
- Archive outdated policies
- Communicate changes to stakeholders

### Compliance
- Map to framework requirements
- Link to implementing controls
- Maintain evidence of reviews
- Track acknowledgments

## Related Topics

- [Controls Management](controls.md)
- [Framework Management](managing-frameworks.md)
- [Employee Compliance](../employee-compliance/overview.md)

