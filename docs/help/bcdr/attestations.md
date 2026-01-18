# Plan Attestations

Plan attestations provide formal sign-off from plan owners confirming BC/DR plans are accurate and current.

## Overview

Attestations help you:
- Meet audit requirements for plan review documentation
- Track when plan owners last confirmed accuracy
- Maintain an audit trail of sign-offs
- Identify plans that need attention

## Attestation Types

| Type | When Used |
|------|-----------|
| **Annual Review** | Scheduled yearly attestation |
| **Post-Update** | After significant plan changes |
| **Post-Incident** | After a plan was activated during an incident |

## Requesting an Attestation

1. Navigate to **BC/DR -> BC/DR Plans**
2. Open the plan detail page
3. Click **Request Attestation**
4. Select the attestation type:
   - Annual Review
   - Post-Update
   - Post-Incident
5. Optionally add a message for the plan owner
6. Click **Send Request**

The plan owner will receive a notification about the pending attestation.

## Completing an Attestation

When you have a pending attestation:

1. Navigate to **BC/DR -> BC/DR Plans** or click the notification
2. Open the plan that needs attestation
3. Click **Complete Attestation**
4. Choose your response:
   - **I Attest** - The plan is accurate and current
   - **Decline** - The plan needs updates (requires a reason)
5. Add any comments
6. Click **Submit**

### If You Decline

When declining an attestation, you must provide a reason explaining what needs to be updated. This helps the plan maintainer understand what changes are required.

## Viewing Attestation History

1. Open any BC/DR plan detail page
2. Click the **Attestation History** tab
3. View all previous attestations including:
   - Date requested
   - Who requested it
   - Attestation type
   - Status (Pending/Attested/Declined)
   - Date responded
   - Comments

## Pending Attestations Widget

The BC/DR Dashboard displays a **Pending Attestations** widget showing:
- Count of attestations waiting for your response
- List of plans requiring attestation
- Quick links to complete each attestation

## Attestation Status on Plans

Plans display their attestation status:

| Status | Meaning |
|--------|---------|
| **Attested** | Plan was recently attested as current |
| **Pending** | Attestation has been requested |
| **Declined** | Attestation was declined, plan needs updates |
| **Overdue** | No recent attestation, may need review |

## Best Practices

1. **Review before attesting**: Actually review the plan content before confirming it is current
2. **Request after updates**: Always request a post-update attestation after significant plan changes
3. **Decline if unsure**: If the plan seems outdated, decline and explain what needs updating
4. **Add meaningful comments**: Comments help with audit trails

## API Endpoints

For programmatic access, see [API Documentation](../../API.md#plan-attestations).

## Related Topics

- [BC/DR Plans](plans.md)
- [BC/DR Dashboard](dashboard.md)
- [DR Tests](dr-tests.md)
