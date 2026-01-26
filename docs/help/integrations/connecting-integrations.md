# Connecting Integrations

Integrations are the backbone of automated compliance. Connect your existing tools to automatically collect evidence and maintain continuous compliance.

## Overview

GigaChad GRC supports 175+ integrations across these categories:

| Category | Examples | Evidence Collected |
|----------|----------|-------------------|
| Cloud Infrastructure | AWS, GCP, Azure | Resource inventory, security configs, IAM |
| Identity Providers | Okta, Azure AD, Google Workspace | Users, groups, MFA status, access reviews |
| Version Control | GitHub, GitLab, Bitbucket | Repos, branch protections, code reviews |
| HR Systems | BambooHR, Workday, ADP | Employee roster, onboarding/offboarding |
| Security Tools | CrowdStrike, Snyk, Wiz | Vulnerabilities, incidents, detections |
| MDM | Jamf, Intune, Kandji | Device inventory, compliance status |

## Connecting an Integration

### Step 1: Find Your Integration

1. Navigate to **Integrations** in the sidebar
2. Use the search bar or filter by category
3. Click on the integration you want to connect

### Step 2: Configure Authentication

Each integration has its own authentication method:

#### API Key Authentication
1. Generate an API key in your service (see service-specific docs)
2. Paste the API key in the configuration form
3. Some services require additional info (region, account ID, etc.)

#### OAuth 2.0 Authentication
1. Click **Connect with [Service Name]**
2. You'll be redirected to authorize GigaChad GRC
3. Grant the required permissions
4. You'll be redirected back automatically

#### Service Account Authentication
1. Create a service account in your cloud provider
2. Download the credentials file (JSON)
3. Upload or paste the credentials in the form

### Step 3: Select Evidence Types

Choose what data to collect:

- **Recommended**: Use default selections for comprehensive coverage
- **Custom**: Select only the evidence types you need
- **Full**: Enable all available evidence types

> ⚠️ **Privacy Note**: Only enable evidence types that are necessary for your compliance requirements.

### Step 4: Set Sync Frequency

Choose how often to sync:

| Frequency | Best For |
|-----------|----------|
| Hourly | High-priority integrations, rapidly changing data |
| Daily | Standard integrations, balanced approach |
| Weekly | Low-priority or slow-changing data |
| Manual | Testing or one-time imports |

### Step 5: Test & Save

1. Click **Test Connection** to verify everything works
2. Review any warnings or errors
3. Click **Save & Connect**
4. Initial sync begins automatically

## Managing Integrations

### Viewing Sync Status

On the Integrations page, each integration shows:
- **Status**: Active, Paused, Error
- **Last Sync**: When data was last collected
- **Evidence Count**: How many items were collected

### Triggering Manual Sync

1. Find the integration
2. Click **Sync Now**
3. Wait for the sync to complete

### Pausing an Integration

1. Click on the integration
2. Toggle **Active** to off
3. Syncs will stop but configuration is preserved

### Disconnecting an Integration

1. Click on the integration
2. Click **Disconnect**
3. Confirm the action
4. Historical evidence is preserved, new syncs stop

## Integration Best Practices

### Security
- Use dedicated service accounts with minimum necessary permissions
- Rotate API keys regularly
- Review audit logs for integration activity

### Performance
- Start with daily syncs and adjust based on needs
- Disable unused evidence types
- Stagger sync times for multiple integrations

### Troubleshooting
- Check API key permissions if syncs fail
- Verify network connectivity for self-hosted deployments
- Review integration logs for detailed error messages

## Category-Specific Guides

### Cloud Providers
- [Amazon Web Services (AWS)](/help/integrations/aws.md)
- [Google Cloud Platform (GCP)](/help/integrations/gcp.md)
- [Microsoft Azure](/help/integrations/azure.md)

### Identity Providers
- [Okta](/help/integrations/okta.md)
- [Azure Active Directory](/help/integrations/azure-ad.md)
- [Google Workspace](/help/integrations/google-workspace.md)

### HR Systems
- [BambooHR](/help/integrations/bamboohr.md)
- [Workday](/help/integrations/workday.md)

### Background Check Providers
- [Checkr](/help/integrations/checkr.md)
- [Certn](/help/integrations/certn.md)

## Need Help?

If you're having trouble connecting an integration:

1. Check the service-specific documentation
2. Verify your credentials and permissions
3. Contact support@example.com with:
   - Integration name
   - Error message (if any)
   - Steps you've tried

---

*Last updated: December 2025*

