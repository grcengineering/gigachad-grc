# BIA Questionnaire Wizard

The Business Impact Analysis (BIA) Wizard guides you through assessing a business process step-by-step with plain-language questions.

## Overview

The wizard helps you:
- Identify critical business processes
- Assess impact across multiple dimensions (financial, operational, reputational, legal)
- Define recovery objectives (RTO/RPO)
- Map dependencies to other processes and assets
- Automatically calculate criticality tier based on your answers

## Starting the Wizard

1. Navigate to **BC/DR -> Business Processes**
2. Click **Add Process with Wizard**
3. Follow the 5-step guided process

## Wizard Steps

### Step 1: Process Identification

Provide basic information about the business process:

| Field | Description | Required |
|-------|-------------|----------|
| Process Name | A clear, descriptive name | Yes |
| Description | Brief overview of what the process does | No |
| Department | The department that owns this process | Yes |
| Process Owner | The person responsible for this process | No |

### Step 2: Impact Assessment

Answer plain-language questions about the potential impact if this process was unavailable:

**Financial Impact**: What would be the financial cost if this process was down?
- None - No financial impact expected
- Minor - Less than $10,000
- Moderate - $10,000 - $100,000
- Major - $100,000 - $1,000,000
- Severe - Over $1,000,000

**Operational Impact**: How would operations be affected?

**Reputational Impact**: Would there be damage to your organization's reputation?

**Legal/Regulatory Impact**: Are there compliance or legal consequences?

### Step 3: Recovery Requirements

Define how quickly the process needs to be restored:

**Recovery Time Objective (RTO)**: How long can this process be unavailable before it causes unacceptable impact?
- 1 hour - Mission critical, must be restored immediately
- 4 hours - Critical, same business day
- 24 hours - Essential, next business day
- 72 hours - Important, within 3 days
- 1 week - Standard, within a week

**Recovery Point Objective (RPO)**: How much data loss is acceptable?
- Zero data loss - Real-time replication required
- 1 hour - Minimal data loss acceptable
- 4 hours - Some data loss acceptable
- 24 hours - Daily backup acceptable
- 1 week - Weekly backup acceptable

### Step 4: Dependencies

Identify what this process depends on:

- **Upstream Process Dependencies**: Which other processes must be operational for this process to function?
- **Critical Assets**: Which IT assets/systems are required for this process?
- **Peak Periods**: When is this process most critical? (e.g., End of Quarter, Payroll Days)
- **Key Stakeholders**: Who should be notified during incidents?

### Step 5: Review & Submit

Review all your answers before submitting. The wizard will display:

- Summary of all entered information
- **Calculated Criticality Tier** based on your impact assessment and recovery requirements

## Criticality Tier Calculation

The wizard automatically calculates the criticality tier:

| Tier | Criteria |
|------|----------|
| **Tier 1 - Critical** | Severe impact in any category OR RTO ≤ 4 hours |
| **Tier 2 - Essential** | Major impact in any category OR RTO ≤ 24 hours |
| **Tier 3 - Important** | Moderate impact in any category OR RTO ≤ 72 hours |
| **Tier 4 - Standard** | Minor/No impact and RTO > 72 hours |

## After Submission

After completing the wizard, you will be redirected to the new process detail page where you can:
- View and edit the generated BIA data
- Link additional dependencies
- Create associated BC/DR plans
- Schedule DR tests

## Related Topics

- [Business Processes](business-processes.md)
- [BC/DR Plans](plans.md)
- [BC/DR Dashboard](dashboard.md)
