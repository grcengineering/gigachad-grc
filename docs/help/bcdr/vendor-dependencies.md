# Vendor BC/DR Dependencies

Track critical vendor dependencies for business processes and identify recovery capability gaps.

## Overview

Vendor dependencies help you:
- Document which vendors support critical business processes
- Track vendor recovery capabilities (RTO/RPO)
- Identify gaps where vendor capabilities don't meet your requirements
- Ensure vendors have business continuity plans
- Plan mitigation for vendor-related risks

## Why Track Vendor Dependencies?

Your business processes often depend on third-party vendors (SaaS providers, cloud platforms, critical suppliers). If a vendor experiences an outage:

- Your processes may be impacted
- Vendor's RTO may exceed your process requirements
- You need visibility into these dependencies for recovery planning

## Accessing Vendor Dependencies

1. Navigate to **BC/DR -> Business Processes**
2. Open a process detail page
3. Click the **Vendor Dependencies** tab

## Adding a Vendor Dependency

1. On the process detail page, go to **Vendor Dependencies** tab
2. Click **Add Vendor**
3. Select the vendor from your TPRM vendor list
4. Enter dependency details:
   - **Dependency Type**: Critical, Important, or Supporting
   - **Vendor RTO**: Vendor's committed recovery time (hours)
   - **Vendor RPO**: Vendor's committed data recovery point (hours)
   - **Vendor Has BCP**: Does the vendor have a business continuity plan?
   - **BCP Last Reviewed**: When was the vendor's BCP last reviewed?
5. Optionally add:
   - Gap Analysis notes
   - Mitigation Plan
   - General notes
6. Click **Save**

## Dependency Types

| Type | Description |
|------|-------------|
| **Critical** | Process cannot function without this vendor |
| **Important** | Significant degradation without this vendor |
| **Supporting** | Minor impact if vendor is unavailable |

## RTO/RPO Gap Detection

The system automatically detects gaps between your process requirements and vendor capabilities:

### RTO Gap
When vendor's RTO exceeds your process RTO, a gap exists:
- Your process needs to recover in 4 hours
- Vendor commits to 8-hour RTO
- Gap = 4 hours (highlighted in red)

### RPO Gap
When vendor's RPO exceeds your process RPO:
- Your process can't lose more than 1 hour of data
- Vendor commits to 4-hour RPO
- Gap = 3 hours (highlighted in red)

### Missing BCP Gap
Critical vendors without a business continuity plan are flagged.

## Vendor Gaps Dashboard Widget

The BC/DR Dashboard includes a **Vendor Recovery Gaps** widget showing:
- Count of identified gaps
- List of gaps with vendor and process names
- Quick links to address each gap

## Mitigation Planning

When a gap is identified:

1. Document the gap in the Gap Analysis field
2. Create a Mitigation Plan that might include:
   - Negotiating better SLAs with the vendor
   - Identifying alternative vendors
   - Building internal workarounds
   - Accepting the risk with appropriate approval
3. Track progress on mitigation efforts

## Bulk View

To see all vendor dependencies across all processes:

1. Navigate to **BC/DR Dashboard**
2. View the Vendor Recovery Gaps widget
3. Click to see full list of gaps

## Integration with TPRM

Vendor dependencies integrate with the Third-Party Risk Management module:

- Vendors come from your TPRM vendor registry
- Vendor security assessments inform BC/DR decisions
- Vendor contracts may include SLA commitments

## Best Practices

1. **Document all critical vendors**: Even if they claim 99.99% uptime
2. **Verify vendor RTOs**: Get contractual commitments, not marketing claims
3. **Request vendor BCPs**: Review annually for critical vendors
4. **Plan for gaps**: Don't just identify gaps—create mitigation plans
5. **Test vendor dependencies**: Include vendor failure scenarios in DR tests

## Related Topics

- [Business Processes](business-processes.md)
- [BC/DR Dashboard](dashboard.md)
- [DR Tests](dr-tests.md)
