# AI-Powered Audit Features

GigaChad GRC integrates AI capabilities to enhance audit efficiency and quality. From automated categorization to intelligent recommendations, AI assists auditors throughout the audit lifecycle.

> **Availability:** Audit AI routes exist, but the UI and provider coverage
> vary by action. Treat the feature descriptions below as intended workflows,
> verify each action against the deployed UI and audit-service Swagger schema,
> and do not use generated output without human review.

## Overview

AI features include:
- **Finding Categorization**: Auto-classify findings
- **Evidence Gap Analysis**: Identify missing evidence
- **Remediation Suggestions**: AI-generated action plans
- **Control Mapping**: Suggest relevant controls
- **Summary Generation**: Auto-create executive summaries

## Configuration

AI features require configuration:

1. Navigate to **Settings → AI Configuration**
2. Select your AI provider (Anthropic or OpenAI)
3. Enter API credentials
4. Enable audit AI features
5. Configure preferences

## Finding Categorization

### How It Works
When you create or import a finding, AI analyzes the description and suggests:
- **Severity**: Critical, High, Medium, Low
- **Category**: Access Control, Change Management, etc.
- **Domain**: Technical, Operational, Administrative
- **Framework Mapping**: Related framework controls

### Using Categorization
1. Create a new finding
2. Enter the description
3. Click **AI Categorize** button
4. Review suggestions
5. Accept, modify, or reject

### Example
```
Finding Description:
"User access reviews are not performed on a quarterly basis 
as required by policy. The last review was 8 months ago."

AI Suggestions:
- Severity: High (confidence: 0.92)
- Category: Access Control (confidence: 0.95)
- Domain: Operational
- Framework: SOC 2 CC6.1, ISO 27001 A.9.2.5
```

## Evidence Gap Analysis

### How It Works
AI analyzes the audit scope and compares against collected evidence to identify:
- Missing evidence types
- Stale evidence (outdated)
- Coverage gaps by control
- Priority areas to address

### Running Gap Analysis
1. Open an audit
2. Go to the **Evidence** tab
3. Click **AI Gap Analysis**
4. Review the analysis report

### Analysis Output
```
Evidence Gap Analysis - SOC 2 Type II Audit

Coverage: 78% (142 of 182 evidence items collected)

Critical Gaps:
1. CC6.1 - User Access Provisioning
   - Missing: Formal access request process documentation
   - Priority: High
   - Recommendation: Request IT Service Management ticket workflow

2. CC7.2 - Change Management
   - Missing: CAB meeting minutes for Q3
   - Priority: Medium
   - Recommendation: Contact Change Manager for records

Stale Evidence:
1. Network Diagram (EVD-045)
   - Last updated: 14 months ago
   - Recommendation: Request current version
```

## Remediation Suggestions

### How It Works
For each finding, AI generates:
- Short-term remediation actions
- Long-term improvements
- Estimated effort
- Suggested owner
- Priority ranking

### Getting Suggestions
1. Open a finding
2. Click **AI Remediation Suggestions**
3. Review the recommendations
4. Use to create remediation plan

### Example Output
```
Finding: Firewall rules not reviewed periodically

Short-Term Actions (0-30 days):
1. Conduct immediate review of all firewall rules
2. Remove any identified stale or unused rules
3. Document current rule set with business justifications

Long-Term Actions (30-90 days):
1. Implement quarterly firewall review process
2. Deploy automated rule analysis tool
3. Establish change request process for new rules
4. Train network team on review procedures

Estimated Effort: 40 hours
Suggested Owner: Network Security Team
Priority: High
```

## Control Mapping

### How It Works
AI matches audit requests and findings to relevant controls by:
- Analyzing text descriptions
- Understanding control objectives
- Cross-referencing frameworks
- Confidence scoring

### Using Control Mapping
1. Create an audit request or finding
2. Click **AI Map Controls**
3. Review suggested mappings
4. Accept or reject each suggestion

### Example
```
Request: "Evidence of password complexity requirements"

Suggested Controls:
1. CC6.1-03 - Password Management (SOC 2)
   Confidence: 0.95
   
2. A.9.4.3 - Password Management System (ISO 27001)
   Confidence: 0.88
   
3. PCI 8.2.3 - Password Requirements (PCI-DSS)
   Confidence: 0.85
```

## Summary Generation

### How It Works
AI creates executive summaries by:
- Analyzing audit scope and objectives
- Summarizing findings by severity
- Highlighting key risks
- Noting positive observations
- Making recommendations

### Generating Summaries
1. Open completed audit
2. Go to **Reports** tab
3. Click **Generate Executive Summary**
4. Review and edit as needed
5. Export or include in report

### Sample Output
```
Executive Summary - Q3 2024 SOC 2 Type II Audit

Overview:
Management of ABC Company engaged GigaChad Audit to perform 
a SOC 2 Type II examination for the period July 1 - December 31, 2024.

Key Findings:
- 2 High severity findings related to access management
- 3 Medium findings in change management
- 5 Low observations noted

Notable Strengths:
- Robust incident response program
- Comprehensive employee training
- Strong vendor management practices

Primary Recommendations:
1. Implement quarterly user access reviews
2. Enhance change management documentation
3. Formalize backup verification process

Overall Assessment:
The organization maintains a strong control environment with 
opportunities for improvement in access management processes.
```

## AI Provider Options

### Anthropic (Claude)
- Claude claude-sonnet-4-20250514 for efficiency
- Claude claude-opus-4-5-20250514 for complex analysis
- Strong reasoning capabilities
- Excellent at nuanced categorization

### OpenAI (GPT)
- GPT-4 for advanced features
- GPT-3.5-turbo for faster operations
- Good general performance
- Wide compatibility

## Best Practices

1. **Review AI Output**: Always verify AI suggestions
2. **Provide Context**: More detail = better suggestions
3. **Train Over Time**: Accept/reject feedback improves accuracy
4. **Use as Assistance**: AI augments, not replaces, judgment
5. **Document Decisions**: Note when AI suggestions are modified

## Limitations

- AI suggestions are recommendations, not decisions
- May miss context-specific nuances
- Requires human review and approval
- Dependent on quality of input data
- API costs apply for usage

## Audit Trail

All AI interactions are logged:
- What was requested
- What was suggested
- What was accepted/rejected
- Who made the decision
- Timestamp

View in **Audit Log** for compliance and quality review.

## API Reference

Use the audit service Swagger document at
`http://localhost:3007/api/docs` for routes present on the running revision.
See the repository [API reference](../../API.md) for routing and authentication.

