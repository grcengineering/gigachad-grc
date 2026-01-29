# Custom Reports

Create and save personalized report configurations for repeated use.

## Overview

Custom Reports allow you to:
- Define reusable report configurations
- Customize sections and filters
- Include specific charts and tables
- Share reports with your organization
- Generate reports on demand

## Creating Custom Reports

### From the Report Builder

1. Navigate to **Tools → Report Builder**
2. Configure your report:
   - Select data sections
   - Apply filters
   - Add charts
   - Configure tables
3. Click **Save as Custom Report**
4. Enter a name and description
5. Choose whether to share with organization

### Report Configuration

| Option | Description |
|--------|-------------|
| **Name** | Report title for identification |
| **Description** | Purpose and contents overview |
| **Report Type** | Base report category |
| **Sections** | Data sections to include |
| **Filters** | Default filter configuration |
| **Charts** | Chart types and configurations |
| **Tables** | Table columns and sorting |
| **Sharing** | Share with organization members |

## Managing Custom Reports

### Viewing Reports

Navigate to **Tools → Custom Reports** to see all saved reports:

- Your personal reports
- Reports shared by organization members
- Last modified date
- Quick actions

### Editing Reports

1. Click on a custom report
2. Modify configuration
3. Click **Save**

Note: You can only edit reports you created.

### Generating Reports

1. Select a custom report
2. Click **Generate**
3. Choose output format (PDF, Excel, CSV)
4. Download or email

### Deleting Reports

1. Click the menu (⋮) on a report
2. Select **Delete**
3. Confirm deletion

Note: You can only delete reports you created.

## API Access

Custom Reports are available via REST API:

### Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/custom-reports` | GET | List all accessible reports |
| `/api/custom-reports/:id` | GET | Get report configuration |
| `/api/custom-reports` | POST | Create new custom report |
| `/api/custom-reports/:id` | PUT | Update report (owner only) |
| `/api/custom-reports/:id` | DELETE | Delete report (owner only) |

### Example: Create Report

```json
POST /api/custom-reports
{
  "name": "Monthly Compliance Summary",
  "description": "Overview of compliance status for board meetings",
  "reportType": "compliance_summary",
  "sections": ["controls", "risks", "evidence"],
  "filters": {
    "dateRange": "last_30_days",
    "status": ["in_progress", "implemented"]
  },
  "chartConfigs": [
    { "type": "pie", "metric": "controlStatus" }
  ],
  "includeCharts": true,
  "includeTables": true,
  "isShared": true
}
```

### Response Format

```json
{
  "success": true,
  "data": {
    "id": "report-123",
    "name": "Monthly Compliance Summary",
    "reportType": "compliance_summary",
    "sections": [...],
    "filters": {...},
    "chartConfigs": [...],
    "includeCharts": true,
    "includeTables": true,
    "isShared": true,
    "createdAt": "2026-01-26T10:00:00Z",
    "updatedAt": "2026-01-26T10:00:00Z"
  }
}
```

## Sharing Reports

### Organization Sharing

When you mark a report as "shared":
- All organization members can view and use it
- Only you (the owner) can edit or delete it
- Shared reports appear in everyone's report list

### Best Practices

- Create shared reports for common use cases
- Use descriptive names and descriptions
- Document the purpose in the description
- Update regularly to keep relevant

## Integration with Scheduled Reports

Custom Reports can be used as templates for Scheduled Reports:

1. Create a Custom Report with desired configuration
2. Go to **Tools → Scheduled Reports**
3. Click **Create from Custom Report**
4. Select your custom report
5. Configure schedule and delivery

## Best Practices

### Report Design
- Focus on actionable insights
- Include relevant context
- Use appropriate visualizations
- Balance detail with clarity

### Naming Convention
- Use descriptive names
- Include purpose or audience
- Example: "Board Meeting - Q1 Risk Summary"

### Maintenance
- Review reports periodically
- Update filters as needed
- Archive outdated reports
- Communicate changes to users

## Related Topics

- [Report Builder](report-builder.md)
- [Scheduled Reports](scheduled-reports.md)
- [Export Options](exports.md)
