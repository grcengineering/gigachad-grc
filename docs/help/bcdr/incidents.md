# BC/DR Incidents

Track and manage the lifecycle of BC/DR incidents from declaration through resolution and post-incident review.

## Overview

Incident management helps you:
- Declare and track BC/DR incidents
- Activate plans and recovery teams
- Maintain a timeline of events
- Capture post-incident learnings
- Meet audit requirements for incident documentation

## Incident Types

| Type | Description |
|------|-------------|
| **Disaster** | Major event requiring full BC/DR activation |
| **Major Incident** | Significant disruption requiring coordinated response |
| **Drill/Exercise** | Planned exercise or test |
| **Near Miss** | Event that could have caused disruption but didn't |

## Severity Levels

| Severity | Description |
|----------|-------------|
| **Critical** | Severe impact, immediate action required |
| **Major** | Significant impact, urgent response needed |
| **Moderate** | Notable impact, prompt response needed |
| **Minor** | Limited impact, standard response |

## Incident Lifecycle

```
Declared → Active → Recovering → Resolved → Closed
```

| Status | Description |
|--------|-------------|
| **Active** | Incident is ongoing, response in progress |
| **Recovering** | Initial response complete, recovery underway |
| **Resolved** | Services restored, monitoring for stability |
| **Closed** | Incident complete, post-incident review done |

## Declaring an Incident

1. Navigate to **BC/DR -> Incidents**
2. Click **Declare Incident**
3. Enter incident details:
   - **Title**: Clear, descriptive incident title
   - **Description**: What is happening
   - **Incident Type**: Select the appropriate type
   - **Severity**: Assess the impact level
4. Click **Declare**

The incident is now active and appears on the dashboard.

## Managing Active Incidents

### Activating Plans

1. Open the incident detail page
2. Click **Activate Plan**
3. Select the BC/DR plan to activate
4. The plan activation is recorded in the timeline

### Activating Teams

1. Click **Activate Team**
2. Select the recovery team to activate
3. Team members receive notifications
4. The team activation is recorded in the timeline

### Adding Timeline Entries

Document what's happening during the incident:

1. Click **Add Note**
2. Select entry type:
   - Status Change
   - Action Taken
   - Note
3. Describe the event
4. Click **Add Entry**

The timeline maintains a complete record of incident events.

## Transitioning Status

As the incident progresses, update the status:

1. Use the status dropdown on the incident page
2. Select the new status
3. A timeline entry is automatically created

Status transitions:
- Active → Recovering (recovery has begun)
- Recovering → Resolved (services restored)
- Resolved → Closed (requires post-incident review)

## Closing an Incident

Closing requires completing a post-incident review:

1. When incident is **Resolved**, click **Close Incident**
2. Complete the Post-Incident Review form:
   - **Root Cause**: What caused the incident
   - **Lessons Learned**: What we learned
   - **Improvement Actions**: What we'll do differently
   - **Actual Downtime**: How long services were unavailable
   - **Data Loss**: How much data was lost (if any)
   - **Financial Impact**: Estimated cost
3. Click **Close with PIR**

## Post-Incident Review (PIR)

The PIR captures important learnings:

### Root Cause
What was the underlying cause of the incident? Be specific.

### Lessons Learned
What did the organization learn from this incident?

### Improvement Actions
Track specific actions to prevent recurrence:
- Description of the action
- Owner responsible
- Due date

### Metrics
- **Actual Downtime**: Total minutes of service unavailability
- **Data Loss**: Minutes of data that couldn't be recovered
- **Financial Impact**: Estimated dollar cost

## Dashboard Integration

The BC/DR Dashboard shows:
- **Active Incident Banner**: Prominent alert when incidents are active
- **Incident Statistics**: Counts by status
- **Average Resolution Time**: Track improvement over time

## Drills and Exercises

For planned exercises:

1. Declare an incident with type **Drill/Exercise**
2. Run through the exercise scenario
3. Track all activities in the timeline
4. Close with lessons learned from the exercise

This creates documentation that exercises were conducted.

## Best Practices

1. **Declare early**: Don't wait to declare an incident
2. **Update the timeline**: Document as you go, not from memory later
3. **Activate the right teams**: Don't under-staff the response
4. **Complete the PIR**: The learning is as important as the response
5. **Track improvement actions**: Follow through on commitments

## Audit Trail

All incident activities are logged in the audit trail:
- Declaration
- Status changes
- Plan activations
- Team activations
- Timeline entries
- Closure with PIR

## Related Topics

- [Recovery Teams](recovery-teams.md)
- [BC/DR Plans](plans.md)
- [BC/DR Dashboard](dashboard.md)
- [DR Tests](dr-tests.md)
