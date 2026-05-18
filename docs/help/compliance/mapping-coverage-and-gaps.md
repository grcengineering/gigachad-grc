# Mapping Coverage and Gap Analysis

Mapping coverage and the gap report give you a quick read on how completely your controls satisfy framework requirements, and a working list of what is left to address. This guide covers the coverage widget, the gap report at `/reports/mapping-gaps`, and the cross-framework copy action.

## Overview

The mapping derived views answer two questions:

- **How much of my compliance program is mapped?** Coverage percentages on the dashboard and on each framework's detail page summarize this at a glance.
- **What is unmapped, and what should I do next?** The gap report enumerates the specific requirements and controls that need attention, with filters and exports for audit prep.

## Coverage Widget

The mapping coverage widget appears in two places:

- **Dashboard**: an aggregate widget that summarizes mapping coverage across all of your organization's controls.
- **Framework detail page**: a per-framework widget that summarizes how many of that framework's requirements have at least one mapped control.

### What the Percentage Means

The widget shows a single headline percentage with a breakdown beneath it.

| Location                         | Headline                                          | Breakdown                                                              |
| -------------------------------- | ------------------------------------------------- | ---------------------------------------------------------------------- |
| Dashboard (aggregate)            | Percent of org controls with at least one mapping | `{mapped} of {total} controls mapped — {unmapped} unmapped`            |
| Framework detail (per-framework) | Percent of requirements mapped                    | `{mapped} of {total} requirements mapped, {unmapped} with no controls` |

### Two-Bucket View

The widget uses a simple two-bucket model: requirements (or controls) are either **mapped** or **unmapped**. It does not distinguish primary mappings from supporting mappings. To see that finer-grained breakdown — including requirements that are covered only by supporting controls — open the [gap report](#gap-report).

### Zero State

When no controls or no requirements exist for the selected scope, the widget shows `0%` and a short note explaining that there is nothing to measure yet. Add at least one control and one framework to populate the widget.

### Permissions

The coverage widget renders only for users with the `frameworks:read` permission. Viewers without framework read access do not see the widget.

## Gap Report

The gap report lives at `/reports/mapping-gaps` and lists every mapping gap in your organization. It is intended for compliance managers and auditors preparing for an audit or cleaning up an inherited mapping set.

### Gap Types

The report distinguishes three gap types:

| Gap Type                                       | Description                                                                                                                                                            |
| ---------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Requirements with no controls**              | Framework requirements that have zero mappings. These are the highest-priority gaps for audit readiness.                                                               |
| **Requirements with only supporting controls** | Requirements that have at least one mapping, but no mapping marked as **primary**. Auditors typically expect at least one primary control per requirement.             |
| **Controls not mapped to anything**            | Controls in your library that are not mapped to any framework requirement. These may be candidates for removal, or for mapping to a framework you have recently added. |

### Tabs and the Framework Filter

The page opens with an **All gap types** tab that concatenates all three gap categories. Three additional tabs scope the table to a single gap type.

A **framework selector** in the toolbar narrows the requirement-based gap types to a single framework. The selector is disabled on the **Controls not mapped to anything** tab, because that view operates on controls rather than on requirements.

### Row Navigation

Clicking a row navigates to the relevant detail page:

- Requirement-based rows open the framework detail page so you can locate the requirement and add a mapping.
- Control-based rows open the control detail page so you can add a framework mapping from the control side.

The v1 report does not deep-link to a specific requirement within a framework — you land on the framework page and find the requirement from there.

### CSV and PDF Export

Two export buttons live on the right side of the toolbar:

- **Export to CSV**: produces a comma-separated file named `mapping-gaps-{type-or-all}-{YYYY-MM-DD}.csv`. The columns match what is shown on the active tab.
- **Export to PDF**: produces a portrait A4 PDF rendering of the current table view, suitable for sharing with auditors.

Both exports respect the active tab and framework filter. Export the **All gap types** tab when you want a single document covering every category.

### Permissions

The gap endpoint is restricted to **admin**, **compliance manager**, and **auditor** roles. Viewers receive a 403 from the API and see a "Not authorized" message on the page.

## Cross-Framework Copy

When the same control satisfies a requirement in multiple frameworks, you can copy an existing mapping to another framework without re-entering it by hand.

### How to Copy a Mapping

1. Open either the **framework detail** page or the **control detail** page.
2. Locate the mapping chip you want to copy in the **Mapped Controls** or **Framework Mappings** list.
3. Click the kebab menu on the chip.
4. Select **Copy to framework…** (the middle item, between **Edit** and **Delete**).
5. The mapping editor opens in `control-to-requirements` mode, pre-seeded with the source mapping's **type** (primary or supporting) and **notes**.
6. Pick the target framework and one or more requirements, adjust the type or notes per row if needed, and save.

The original mapping is left untouched — copy creates new mappings on the target framework's requirements.

### Tips

- The kebab menu shows **Copy to framework…** only for users with the `controls:update` permission (the same permission required to edit a mapping).
- The mapping type and notes are pre-filled from the source, but you can change either per row before saving.
- If you accidentally pick the same framework as the source, the backend will reject the duplicate and surface a toast — there is no client-side prevention in v1.

## Related Topics

- [Framework Management](managing-frameworks.md)
- [Controls Management](controls.md)
- [Evidence Collection](evidence.md)
