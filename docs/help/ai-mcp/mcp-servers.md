# MCP Server Integration Guide

Configure Model Context Protocol (MCP) servers to automate GRC workflows, evidence collection, and compliance checks.

> **Deployment status:** The three packages exist under `mcp-servers/`, but the
> default Docker Compose stack does not build, start, or connect them. The
> in-app settings store configuration; they do not make an MCP package
> available by themselves. Build and operate each server separately, configure
> credentials, and verify its advertised tools before use.

## Overview

MCP (Model Context Protocol) is an open protocol for connecting AI assistants to external tools and data sources. GigaChad GRC includes three purpose-built MCP servers:

| Server | Purpose |
|--------|---------|
| **grc-evidence** | Automated evidence collection from cloud providers and security tools |
| **grc-compliance** | Automated compliance checking and report generation |
| **grc-ai-assistant** | AI-powered GRC analysis and recommendations |

## Accessing MCP Settings

1. Navigate to **Settings** in the sidebar
2. Click **MCP Servers**

Or from AI Configuration:

1. Go to **Settings** → **AI Configuration**
2. Click **Configure MCP →** at the bottom

## GRC Evidence Server

Automatically collect compliance evidence from your infrastructure.

### Supported Integrations

#### Cloud Providers

| Integration | Evidence Types |
|-------------|----------------|
| **AWS** | S3 bucket configurations, IAM policies, EC2 instances, VPC settings, AWS Config rules |
| **Azure** | Resource configurations, RBAC settings, security policies |
| **Google Cloud** | IAM policies, resource configurations, security settings |

#### Identity & Access

| Integration | Evidence Types |
|-------------|----------------|
| **Okta** | MFA enrollment status, password policies, inactive users |
| **Google Workspace** | User MFA status, admin roles, sharing settings |
| **Azure AD** | User configurations, conditional access policies |

#### Development & Security

| Integration | Evidence Types |
|-------------|----------------|
| **GitHub** | Branch protection rules, secrets scanning, Dependabot alerts |
| **GitLab** | Security configurations, pipeline settings |
| **Vulnerability Scanners** | Scan results from Trivy, Snyk, Qualys |

#### Device Management

| Integration | Evidence Types |
|-------------|----------------|
| **Jamf** | Device encryption status, OS versions, security patches |
| **Kandji** | Device compliance, MDM enrollment |
| **Intune** | Device configurations, compliance status |

### Configuration

1. In MCP Settings, click **Add Server**
2. Select **GRC Evidence Collection**
3. Configure required environment variables:

```bash
# AWS (uses default credentials or specify)
AWS_ACCESS_KEY_ID=AKIA...
AWS_SECRET_ACCESS_KEY=...
AWS_REGION=us-east-1

# GitHub
GITHUB_TOKEN=ghp_...

# Okta
OKTA_ORG_URL=https://your-org.okta.com
OKTA_API_TOKEN=...

# Azure
AZURE_SUBSCRIPTION_ID=...
AZURE_CLIENT_ID=...
AZURE_CLIENT_SECRET=...
AZURE_TENANT_ID=...
```

4. Click **Deploy Server**

### Available Tools

| Tool | Description | Parameters |
|------|-------------|------------|
| `collect_aws_evidence` | Collect AWS configuration evidence | `service` (s3, iam, ec2, vpc, config), `resourceId` (optional) |
| `collect_azure_evidence` | Collect Azure resource evidence | `resourceType`, `resourceName` (optional) |
| `collect_github_evidence` | Collect GitHub security evidence | `owner`, `repo`, `evidenceType` (branch_protection, secrets_scanning, dependabot) |
| `collect_okta_evidence` | Collect Okta security evidence | `evidenceType` (mfa_status, password_policy, inactive_users) |
| `scan_vulnerability` | Run vulnerability scan | `target`, `scanType` (container, dependency, network, web) |
| `capture_screenshot` | Capture webpage screenshot | `url`, `fullPage` (optional) |

## GRC Compliance Server

Automate compliance testing and report generation.

### Supported Frameworks

- **SOC 2** - Trust Services Criteria checks
- **ISO 27001** - Annex A control verification
- **HIPAA** - Security Rule compliance checks
- **GDPR** - Data protection requirement validation
- **PCI DSS** - Payment card security checks
- **NIST CSF** - Cybersecurity framework assessment

### Available Tools

| Tool | Description | Parameters |
|------|-------------|------------|
| `run_control_test` | Execute automated control test | `controlId`, `evidence` (array of evidence objects) |
| `validate_policy_compliance` | Check policy against requirements | `policyId`, `requirements` (array of requirement IDs) |
| `generate_compliance_report` | Generate compliance report | `frameworkId` (optional), `scope` (optional), `format` (pdf, json) |
| `check_soc2_controls` | Run SOC 2 specific checks | `controlIds` (optional array) |
| `check_iso27001_controls` | Run ISO 27001 checks | `controlIds` (optional array) |
| `check_hipaa_controls` | Run HIPAA checks | `controlIds` (optional array) |
| `check_gdpr_controls` | Run GDPR checks | `controlIds` (optional array) |

### Configuration

1. In MCP Settings, click **Add Server**
2. Select **GRC Compliance Automation**
3. No additional credentials required (uses platform data)
4. Click **Deploy Server**

## GRC AI Assistant Server

AI-powered analysis and recommendations for GRC operations.

### Capabilities

| Capability | Description |
|------------|-------------|
| **Risk Analysis** | Deep analysis of risks with contextual understanding |
| **Control Suggestions** | AI-recommended controls for risks and requirements |
| **Policy Drafting** | Generate policy documents from requirements |
| **Requirement Mapping** | Automatically map controls to framework requirements |
| **Finding Explanation** | Plain language explanation of audit findings |
| **Remediation Prioritization** | AI-prioritized remediation actions |
| **Gap Analysis** | Identify compliance gaps |
| **Vendor Risk Assessment** | AI-assisted vendor risk evaluation |

### Available Tools

| Tool | Description | Parameters |
|------|-------------|------------|
| `analyze_risk` | Deep risk analysis | `risk` (object), `context` (object), `frameworks` (array) |
| `suggest_controls` | Recommend controls | `riskId` or `requirementId`, `context` |
| `draft_policy` | Generate policy draft | `policyType`, `requirements` (array), `context` |
| `map_requirements` | Map control to requirements | `controlDescription`, `frameworkRequirements` (array) |
| `explain_finding` | Explain audit finding | `finding` (object), `context` |
| `prioritize_remediation` | Prioritize remediations | `items` (array), `context` |
| `analyze_compliance_gap` | Gap analysis | `frameworkId`, `existingControls` (array), `context` |
| `assess_vendor_risk` | Vendor risk assessment | `vendorInfo` (object), `context` |

### Configuration

1. In MCP Settings, click **Add Server**
2. Select **GRC AI Assistant**
3. Configure AI provider credentials:

```bash
# OpenAI
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-5

# OR Anthropic
ANTHROPIC_API_KEY=sk-ant-...
ANTHROPIC_MODEL=claude-opus-4-5-20250514
```

4. Click **Deploy Server**

## Creating Workflows

Combine MCP tools into automated workflows.

### Example: Daily Evidence Collection

```json
{
  "name": "Daily Evidence Collection",
  "description": "Collect evidence from AWS and GitHub daily",
  "trigger": "schedule:daily",
  "steps": [
    {
      "id": "step-1",
      "name": "Collect AWS IAM Evidence",
      "serverId": "grc-evidence",
      "toolName": "collect_aws_evidence",
      "args": { "service": "iam" }
    },
    {
      "id": "step-2",
      "name": "Collect GitHub Branch Protection",
      "serverId": "grc-evidence",
      "toolName": "collect_github_evidence",
      "args": {
        "owner": "your-org",
        "repo": "main-app",
        "evidenceType": "branch_protection"
      }
    },
    {
      "id": "step-3",
      "name": "Run SOC 2 Checks",
      "serverId": "grc-compliance",
      "toolName": "check_soc2_controls",
      "args": {},
      "dependsOn": ["step-1", "step-2"]
    }
  ]
}
```

### Workflow Triggers

| Trigger | Description |
|---------|-------------|
| `manual` | Manually triggered |
| `schedule:daily` | Runs daily |
| `schedule:weekly` | Runs weekly |
| `schedule:monthly` | Runs monthly |
| `event:control_updated` | When a control is updated |
| `event:risk_created` | When a new risk is created |
| `event:evidence_expired` | When evidence expires |

### Creating a Workflow

1. Go to **Settings** → **MCP Servers**
2. Click the **Workflows** tab
3. Click **Create Workflow**
4. Configure:
   - Name and description
   - Trigger type
   - Steps with tool calls
   - Step dependencies
5. Click **Save**

## Server Status

### Status Indicators

| Status | Description |
|--------|-------------|
| 🟢 **Connected** | Server is running and healthy |
| 🟡 **Connecting** | Server is starting up |
| 🔴 **Error** | Server encountered an error |
| ⚪ **Disconnected** | Server is not running |

### Managing Servers

- **Start**: Click the play button to connect
- **Stop**: Click the stop button to disconnect
- **Delete**: Click the trash icon to remove
- **View Details**: Click on a server to see capabilities

## Troubleshooting

### Server won't connect

1. Check that required environment variables are set
2. Verify API credentials are valid
3. Check network connectivity to external services
4. Review server logs for errors

### Evidence collection fails

1. Verify integration credentials have necessary permissions
2. Check that target resources exist
3. Review rate limits on external APIs

### Workflow execution stuck

1. Check step dependencies are correct
2. Verify all referenced servers are connected
3. Review execution logs for errors

## Security Considerations

- **Credentials**: All API keys and secrets are encrypted at rest
- **Network**: MCP servers run in isolated containers
- **Permissions**: Tool execution requires appropriate user roles
- **Audit**: All MCP operations are logged

## Support

For issues with MCP configuration, contact **support@example.com**.

---

*Last updated: December 2025*




