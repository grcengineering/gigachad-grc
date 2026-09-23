# Organization Settings

Configure your organization's profile, branding, and platform-wide settings.

## Overview

Organization Settings include:
- Organization profile and details
- Platform branding (logo, name)
- Security and authentication settings
- Module configuration
- Data management options

## Accessing Settings

Navigate to **Settings → Organization** to access organization-level configuration.

## Organization Profile

### Basic Information
Configure your organization's identity:

- **Organization Name**: Your company name
- **Description**: Brief description
- **Industry**: Select your industry sector
- **Primary Contact Email**: Main contact for the platform
- **Timezone**: Default timezone for dates/times

### Save Changes
Click **Save Organization** to apply changes.

## Platform Branding

Customize the platform appearance:

### Platform Name
- Appears in sidebar, login page, emails
- Replace "GigaChad GRC" with your name

### Logo
- Upload your logo
- Recommended: Square, 128x128 minimum
- Formats: PNG, SVG (transparent background works best)

### Alternative: Logo URL
Enter a URL to your hosted logo image.

### Save Branding
Click **Save Branding** to apply changes.

## Security Settings

### Authentication
Configure how users log in:

- **SSO Only**: Require SSO, disable password login
- **Password + SSO**: Allow both methods
- **Password Only**: Disable SSO

### Session Settings
- **Session Timeout**: Auto-logout after inactivity
- **Concurrent Sessions**: Allow multiple sessions
- **Remember Device**: Allow "remember me" option

### Password Policy
If password authentication enabled:
- Minimum length
- Complexity requirements
- Expiration period
- History (prevent reuse)

### Multi-Factor Authentication
- **Optional**: Users can enable MFA
- **Required**: All users must use MFA
- **Admin Required**: Only admins must use MFA

## Module Configuration

Enable or disable platform modules:

### Available Modules
- **Compliance**: Controls, frameworks, evidence
- **Data Management**: Policies, assets, integrations
- **Risk Management**: Risk register, heatmaps, scenarios
- **Third-Party Risk**: Vendors, assessments, contracts
- **BC/DR**: Business continuity, disaster recovery
- **Audit**: Internal/external audits
- **Trust Center**: Public trust center, knowledge base
- **People & Compliance**: Employee compliance, training
- **AI Features**: AI assistant, risk analysis
- **Tools & Reports**: Dashboards, scheduled reports

### Enabling/Disabling
1. Go to **Settings → Module Configuration**
2. Toggle modules on/off
3. Click **Save Configuration**

Disabled modules:
- Hidden from navigation
- APIs return 403
- Data preserved but inaccessible

## Multi-Workspace Mode

Enable multiple workspaces within your organization:

### Enable
1. Go to Organization Settings
2. Toggle **Multi-Workspace Mode** on
3. Confirm the change

### Manage Workspaces
Once enabled:
- Go to **Settings → Workspaces**
- Create, edit, delete workspaces
- Assign users to workspaces

See [Workspaces](workspaces.md) for details.

## Data Portability

Export your organization's data:

### Export Data
1. Find **Data Portability & Offboarding** section
2. Click **Export Organization Data (JSON)**
3. Wait for export to complete
4. Download the JSON file

### Export Includes
- Risks
- Controls and implementations
- Evidence metadata
- Vendors
- Audits
- Audit logs

### Use Cases
- Backup
- Migration to another system
- Compliance documentation
- Business continuity

## Demo Data

Demo seed operations are development-only and are not available from the
current Organization settings UI. Use the API commands in the
[Demo Data Guide](../getting-started/demo-data.md).

Reset is destructive for organization records; it does not distinguish
"real" records from seeded records. Review the status response and back up
anything that must be preserved before reset.

## Notification Settings

Configure organization-wide notifications:

### Email Notifications
- Enable/disable email sending
- Configure email templates
- Set from address

### In-App Notifications
- Notification retention period
- Digest frequency options
- Priority settings

## Integration Settings

Configure third-party integrations:

### Available Integrations
View and manage connected integrations:
- Cloud platforms (AWS, Azure, GCP)
- Identity providers
- SIEM systems
- Communication tools

See [Integrations](../integrations/connecting-integrations.md) for setup.

## Audit Configuration

### Audit Log Retention
Set how long to keep audit logs:
- 90 days
- 1 year
- 2 years
- Custom period

### Audit Export
Enable automatic audit log export to:
- S3 bucket
- SIEM system
- External archive

## Best Practices

### Initial Setup
1. Configure organization profile first
2. Set up branding
3. Configure security settings
4. Enable required modules
5. Set up integrations

### Regular Review
- Review settings quarterly
- Update branding as needed
- Adjust modules based on usage
- Verify security settings

### Change Management
- Document setting changes
- Test changes in staging if possible
- Communicate changes to users

## Related Topics

- [User Management](users.md)
- [Permission Groups](permissions.md)
- [Module Configuration](../deployment/module-configuration.md)
- [Workspaces](workspaces.md)

