# Recovery Teams

Recovery teams define the people responsible for executing recovery activities during an incident or disaster.

## Overview

Recovery teams help you:
- Define who responds during BC/DR incidents
- Assign roles and responsibilities
- Track primary and alternate personnel
- Link teams to specific BC/DR plans
- Maintain current contact information

## Team Types

| Type | Purpose |
|------|---------|
| **Crisis Management** | Executive-level decision making during major incidents |
| **IT Recovery** | Technical restoration of systems and infrastructure |
| **Business Recovery** | Resumption of business operations and processes |
| **Communications** | Internal and external communications during incidents |
| **Executive** | C-level oversight and strategic decisions |

## Accessing Recovery Teams

Navigate to **BC/DR -> Recovery Teams** to view, create, and manage teams.

## Creating a Team

1. Navigate to **BC/DR -> Recovery Teams**
2. Click **Create Team**
3. Enter team details:
   - **Name**: Clear, descriptive team name
   - **Team Type**: Select from available types
   - **Description**: Purpose and responsibilities
   - **Activation Criteria**: When this team should be activated
   - **Assembly Location**: Where the team meets (physical or virtual)
   - **Communication Channel**: Primary communication method (Slack, Teams, etc.)
4. Click **Create**

## Managing Team Members

### Adding Members

1. Open the team detail page
2. Click **Add Member**
3. Choose member type:
   - **Internal User**: Select from your organization's users
   - **External Contact**: Enter contact details manually
4. Assign a role:
   - Team Lead
   - Alternate Lead
   - Technical Lead
   - Coordinator
   - Member
5. Add responsibilities (optional)
6. Click **Add Member**

### Member Roles

| Role | Description |
|------|-------------|
| **Team Lead** | Primary leader, makes key decisions |
| **Alternate Lead** | Backup for Team Lead when unavailable |
| **Technical Lead** | Technical expertise and guidance |
| **Coordinator** | Logistics and coordination tasks |
| **Member** | General team member |

### Primary vs. Alternate

- **Primary**: The default person for their role
- **Alternate**: Backup for a specific primary member

When adding an alternate, specify which member they back up.

### External Contacts

For team members not in your user system (e.g., vendors, contractors):
- Enter their name, email, and phone
- They appear in the team roster for reference
- No system access is granted

## Linking Teams to Plans

Teams can be linked to BC/DR plans to define which teams respond to which incidents.

### Linking from the Team

1. Open the team detail page
2. Click **Link to Plan**
3. Select a BC/DR plan
4. Optionally describe the team's role in that plan
5. Click **Link**

### Viewing from the Plan

On the BC/DR plan detail page, you can see all teams linked to that plan.

## Team Activation

During an incident, teams are activated through the incident management workflow:

1. An incident is declared
2. The incident commander selects teams to activate
3. Team members receive notifications
4. The timeline records team activation

See [Incidents](incidents.md) for more details.

## Best Practices

1. **Keep rosters current**: Review team membership regularly
2. **Define alternates**: Ensure coverage when primary members are unavailable
3. **Include contact info**: Especially for external contacts
4. **Link to relevant plans**: Make sure teams know which plans they support
5. **Test activation**: Include team activation in DR exercises

## Team Statistics

The dashboard shows:
- Total teams
- Active teams
- Total members across all teams
- Teams by type

## Related Topics

- [BC/DR Incidents](incidents.md)
- [BC/DR Plans](plans.md)
- [Exercise Templates](exercise-templates.md)
