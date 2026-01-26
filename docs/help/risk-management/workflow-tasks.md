# Risk Workflow Tasks

Automated task management for your risk workflow process.

## Overview

Risk Workflow Tasks automatically create and assign tasks at key points in the risk management lifecycle, ensuring nothing falls through the cracks and keeping stakeholders accountable.

## How It Works

When risks transition through workflow stages, the system automatically:
- Creates tasks for the appropriate assignee
- Sets due dates based on configurable timelines
- Sends notifications via email, in-app, and Slack
- Tracks completion and resulting actions

## Automatic Task Creation

Tasks are automatically created at these workflow transition points:

| Trigger | Task Created | Assignee | Due | Priority |
|---------|-------------|----------|-----|----------|
| Risk validated | Complete Risk Assessment | Risk Assessor | 14 days | Medium |
| Assessment submitted | Review Risk Assessment | GRC Team | 7 days | High |
| Assessment approved | Make Treatment Decision | Risk Owner | 14 days | High |
| Executive approval needed | Executive Approval Required | Executive | 7 days | Critical |
| Mitigation started | Update Mitigation Progress | Risk Owner | 30 days | Medium |

## Task Types

### Validation Tasks
- **VALIDATE**: Initial risk validation by GRC

### Assessment Tasks
- **ASSESS**: Complete the risk assessment
- **REVIEW_ASSESSMENT**: GRC review of submitted assessment

### Treatment Tasks
- **TREATMENT_DECISION**: Decide on risk treatment approach
- **EXECUTIVE_APPROVAL**: Executive sign-off for high-impact decisions
- **MITIGATION_UPDATE**: Progress updates during mitigation

### Custom Tasks
- **CUSTOM**: Manually created tasks for specific needs

## Managing Tasks

### My Queue

Access your assigned tasks from **Risk Management → My Queue**:

- View all tasks assigned to you
- Filter by status, priority, or workflow stage
- Start, complete, or cancel tasks
- See overdue items highlighted

### Task Actions

| Action | Description |
|--------|-------------|
| **Start** | Move task from pending to in-progress |
| **Complete** | Mark task as done with optional notes |
| **Cancel** | Cancel task with reason |
| **Reassign** | Transfer to another user |

### Completion Notes

When completing tasks, add notes describing:
- What was done
- Any decisions made
- Resulting actions taken

## Task Panel

Each risk detail page includes a **Tasks** panel showing:

- Active tasks for this risk
- Completed task history
- Auto-created vs. manual task indicator
- Quick action buttons

### Creating Manual Tasks

1. Open risk detail page
2. Click **Add Task** in the Tasks panel
3. Fill in task details:
   - Title and description
   - Assignee
   - Due date
   - Priority
4. Save

## Notifications

### When Tasks Are Created

Assignees receive notifications via:
- **In-app**: Bell icon notification
- **Email**: Task assignment email
- **Slack**: Channel or DM (if configured)

### When Tasks Are Due

Reminders are sent:
- 3 days before due date
- 1 day before due date
- On due date
- Daily while overdue

### Configuring Notifications

Users can configure their preferences in **Account Settings → Notifications**:
- Enable/disable channels
- Set quiet hours
- Choose notification frequency

## Dashboard Statistics

The My Queue dashboard shows:

| Metric | Description |
|--------|-------------|
| **Pending** | Tasks not yet started |
| **In Progress** | Tasks currently being worked |
| **Overdue** | Past due date |
| **Completed This Week** | Recently finished |

## Best Practices

### For Risk Owners

- Check My Queue daily
- Start tasks promptly
- Add detailed completion notes
- Reassign if you're blocked

### For GRC Teams

- Review pending tasks weekly
- Monitor overdue items
- Adjust due dates if needed
- Use completion notes for audit trail

### For Executives

- Prioritize critical approval tasks
- Delegate review when appropriate
- Document approval rationale

## Workflow Integration

Tasks integrate with the risk workflow:
- Task completion can trigger workflow transitions
- Resulting actions are recorded
- Full audit trail maintained

## Related Topics

- [Creating Risks](creating-risks.md)
- [Risk Assessment](assessment.md)
- [Risk Treatment](treatment.md)
- [Risk Dashboard](dashboard.md)
