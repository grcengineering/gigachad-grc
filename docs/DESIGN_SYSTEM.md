# GigaChad GRC — Design System

This is the architectural reference for the GRC frontend's design system. It explains how the system is layered, how changes propagate, how compliance is enforced, and how to extend the system without introducing drift.

The live, browsable showcase of every primitive is at `/design-system` in the running app (source: `frontend/src/pages/DesignSystem.tsx`).

---

## 1. Six-layer architecture

The system is intentionally layered so that updates at one layer cascade automatically to every consumer above it. Higher layers depend on lower layers; lower layers know nothing of higher layers.

```
┌─────────────────────────────────────────────────────────────────┐
│ 6. Pages                                                        │
│    src/pages/*.tsx                                              │
│    Compose primitives. Should contain almost no Tailwind        │
│    classes that don't come from the primitives.                 │
├─────────────────────────────────────────────────────────────────┤
│ 5. Domain helpers                                               │
│    src/lib/categoryStyle.ts   (toTitleCase, categoryStyle)     │
│    src/lib/riskStatus.ts      (riskStatusVariant)              │
│    Map domain values (statuses, categories) to design tokens.  │
├─────────────────────────────────────────────────────────────────┤
│ 4. Primitives                                                   │
│    src/components/ui/*.tsx                                      │
│    Button, Card, Badge, CategoryChip, Input, Select, Textarea, │
│    Label, Dialog, Drawer, Tabs, DataTable, FilterBar,          │
│    EmptyState, Skeleton, StatCard, Sparkline, Tooltip, Kbd,    │
│    PageHeader.                                                  │
├─────────────────────────────────────────────────────────────────┤
│ 3. Legacy CSS classes                                           │
│    src/index.css @layer components                              │
│    .btn-*, .badge-*, .card, .input — kept aligned with         │
│    primitive colors so legacy callsites stay visually correct  │
│    while they wait to be migrated.                              │
├─────────────────────────────────────────────────────────────────┤
│ 2. CSS variables                                                │
│    src/index.css :root                                          │
│    --background, --foreground, --card, --primary, --accent,    │
│    --destructive, --border, --ring, etc. (consumed by any      │
│    raw CSS that needs runtime tokens)                           │
├─────────────────────────────────────────────────────────────────┤
│ 1. Tokens                                                       │
│    frontend/tailwind.config.js                                  │
│    Color palette (surface, brand, accent), typography scale,   │
│    spacing, radii, shadows, font-family.                       │
└─────────────────────────────────────────────────────────────────┘
```

**Propagation rules**:

| You change… | These automatically update | These require manual migration |
|---|---|---|
| Tokens (`tailwind.config.js`) | Everything that uses a Tailwind utility class (e.g., `bg-surface-50`) | Inline color hex values (rare) |
| CSS variables (`:root`) | Anything reading `--background`, `--card`, etc. | — |
| Legacy classes (`.badge-success`, `.btn-primary`) | Every existing `<span className="badge-success">` and `<button className="btn-primary">` | — |
| Primitive (`Button.tsx`) | Every `<Button>` import across the app | Hand-rolled `<button className="px-4 py-2 …">` markup |
| Domain helper (`riskStatusVariant`) | Every caller of `riskStatusVariant()` | Hardcoded status → color mappings |
| Page | Just that page | — |

---

## 2. Foundational tokens

Defined in `frontend/tailwind.config.js`.

### Color palette

| Palette | Purpose | Range |
|---|---|---|
| **`surface-*`** | Page background, cards, borders, text on light | `surface-50` (#fcfcfb off-white page bg) → `surface-950` (deepest text) |
| **`brand-*`** | Primary CTAs, positive/passing semantics | Emerald: `brand-500` (#10b981) → `brand-700` (#047857) |
| **`accent-*`** | Emphasis, human moments. **Never for status.** | Terracotta: `accent-500` (#d97757) |
| Tailwind built-ins | Use for status semantics only | `emerald` (success), `amber` (warning), `red` (danger), `blue/sky/indigo/violet/teal/cyan/orange/rose/fuchsia/lime` (category chips) |

**Rules**:
- Never use raw `gray-*` — only `surface-*`.
- For text on the cream background, use the `700`/`800` shades. `300`/`400` are unreadable (caught by lint rule).
- Page bg is `surface-50`. Card bg is `white`. Borders are `surface-200`.

### Typography scale

| Class | Size / leading | Use |
|---|---|---|
| `text-display` | 32px / 38px | Hero numbers |
| `text-h1` | 26px / 32px | Page title |
| `text-h2` | 18px / 26px | Section heading |
| `text-h3` | 15px / 22px | Card title |
| `text-body` | 14px / 20px | Body copy |
| `text-small` | 13px / 18px | Secondary copy, table cells |

Use `font-mono` for codes, IDs, references (e.g., `CR-042`, `AUD-001`).

### Shadows

`shadow-lift` (resting cards), `shadow-lift-hover` (hovered), `shadow-glow-brand`, `shadow-glow-accent`.

### Spacing rhythm

Card density is encoded in `<Card density="compact|cozy|comfy">`. Internal grids use `gap-3` / `gap-4` / `gap-6`.

---

## 3. Primitives (the design system itself)

Every primitive lives in `frontend/src/components/ui/` and is re-exported from `frontend/src/components/ui/index.ts`. Import like:

```ts
import { Button, Card, Badge, CategoryChip } from '@/components/ui';
```

### The 20 primitives and when to use them

| Primitive | Use for |
|---|---|
| `Button` | Every clickable action. Variants: `primary`, `secondary`, `outline`, `ghost`, `danger`, `link`. Sizes: `sm`, `md`, `lg`, `icon`. |
| `Card` + slots | Container surfaces. `Card` (wrapper), `CardHeader`, `CardTitle`, `CardDescription`, `CardBody`, `CardFooter`. |
| `Badge` | Status pills. Variants: `neutral`, `success`, `warning`, `danger`, `info`, `brand`. Sizes: `sm`, `md`. **Capitalizes by default** — pass `capitalize={false}` for acronyms (PDF, MFA, CSV). |
| `CategoryChip` | Categorical pills with stable per-category color (control category, framework type, permission resource). Case modes: `title` (default), `upper` (for framework types / standards like SOC 2, ISO 27001), `preserve` (for deliberate mixed-case like FedRAMP). |
| `Input` | Single-line text input. Sizes: `sm`, `md`, `lg`. Supports `leftIcon`, `rightSlot`, `invalid`. |
| `Textarea` | Multi-line text input. |
| `Label` + `FieldHint` | Field label and helper text. `Label` has `required`; `FieldHint` has `error`. |
| `Select` | Dropdown. `searchable` prop turns it into a Combobox. `clearable` adds an X. |
| `EmptyState` | "No results / nothing here yet" state. Sizes: `sm`, `md`, `lg`. |
| `Skeleton` / `SkeletonText` / `SkeletonRows` | Loading placeholders. |
| `PageHeader` | Title + description + actions row at the top of every page. |
| `FilterBar` | The filter row above tables. Takes `active` filter chips. |
| `Tabs` | Tab strip. Pass `tabs={[{label, content, disabled?}]}`. |
| `Dialog` | Modal. **Never hand-roll `<div className="fixed inset-0">`** — caught by lint rule. |
| `Drawer` | Slide-in side panel for record detail. The drawer-first pattern: list row click opens a drawer, not a navigation. |
| `Tooltip` | Hover hint. |
| `DataTable` | TanStack v8 table wrapper. Column shape: `{ id, accessorKey, header, cell, mobileLabel }`. |
| `Sparkline` | Tiny trend line. |
| `StatCard` | Headline metric tile. Tones: `brand`, `accent`, `emerald`, `red`, `amber`, `blue`, `purple`, `neutral`. Optional `delta`, `trend` (sparkline), `caption`. |
| `Kbd` | Keyboard key hint. |

### Page composition rules

Every **list page**: `PageHeader` → `FilterBar` → `DataTable` (or `Card` grid).
Every **detail page**: back link → `PageHeader` with meta + actions → meta strip → `Tabs`.
Every async surface: `Skeleton` while loading, `EmptyState` when empty.

---

## 4. Domain helpers

Helpers in `frontend/src/lib/` map domain concepts to design system values. They are the single source of truth — never inline a "status → color" mapping in a page.

### `categoryStyle.ts`

- `categoryStyle(category)` → returns a `bg-* text-* border-*` className for the colored chip. Stable hash + explicit mapping for known categories (SOC 2 → sky, HIPAA → emerald, NIST → violet, etc.).
- `toTitleCase(s)` → "TYPE FW DBG" → "Type Fw Dbg". Preserves all-letter acronyms ≤4 chars.
- The `EXPLICIT` map at the top of the file is where you add known categories with deliberate colors.

### `riskStatus.ts`

- `riskStatusVariant(status)` → returns a `BadgeVariant` for a risk status string. Single source of truth across `Risks.tsx`, `RiskDrawer.tsx`, `RiskDashboard.tsx`, `RiskDetail.tsx`.

To add a new helper of this kind, follow the same shape: pure function from domain value → design system value.

---

## 5. ESLint enforcement

`frontend/.eslintrc.cjs` defines 10 `no-restricted-syntax` rules that fail on the patterns that bypass the design system:

| Rule | Catches | Fix with |
|---|---|---|
| 1 | Legacy `.btn-*` CSS class | `<Button variant="...">` |
| 2 | Legacy `.badge-*` CSS class | `<Badge variant="...">` |
| 3 | Hand-rolled `fixed inset-0` modal | `<Dialog open onClose>` |
| 4 | `text-(color)-300/400` (too faint) | Use `600`-`800` for text, `text-surface-500` for muted |
| 5 | `rounded-full` on text pills | `rounded-md` via `<Badge>` |
| 6 | Hand-rolled colored pill | `<Badge>` or `<CategoryChip>` |
| 7 | `bg-surface-100/200 + border` card chrome | `<Card>` or `bg-white border-surface-200` |
| 8 | Raw `<input type="text\|email\|number\|date\|…">` | `<Input>` |
| 9 | Raw `<select>` | `<Select>` |
| 10 | Raw `<textarea>` | `<Textarea>` |

Allowed exceptions (no lint suppression needed):
- `<input type="file">`, `type="checkbox"`, `type="radio"`, `type="hidden"`.

Intentional one-off exceptions (suppress with comment, explain why):

```tsx
// eslint-disable-next-line no-restricted-syntax -- HTTP method chip is intentionally uppercase
<span className="px-2 py-0.5 rounded-md bg-blue-500 text-white">GET</span>
```

### Pre-commit hook

`.husky/pre-commit` runs `npx eslint` on every staged frontend `.ts`/`.tsx` file. It blocks the commit if any error appears.

Bypass (only when necessary, e.g., snapshot commits):

```bash
git commit --no-verify -m "wip"
```

### Running lint manually

```bash
cd frontend
npm run lint              # whole project
npx eslint src/pages/Foo.tsx   # one file
```

---

## 6. Adding to the design system

### Adding a new token

Edit `frontend/tailwind.config.js`. Every Tailwind utility that resolves to that token re-resolves on the next build. No code changes needed elsewhere.

### Adding a new primitive

1. Create `frontend/src/components/ui/MyPrimitive.tsx`.
2. Add `export` line to `frontend/src/components/ui/index.ts`.
3. Add a section to `frontend/src/pages/DesignSystem.tsx` showcasing every variant/state.
4. If the primitive replaces a hand-rolled pattern, add a `no-restricted-syntax` rule in `.eslintrc.cjs` to flag the old pattern.

### Updating a primitive

Just edit the file. Every page that imports the primitive gets the update on the next build. No migration needed.

### Adding a new domain helper

Pure function from domain value → design-system value. Put it in `frontend/src/lib/`. Import where needed.

---

## 7. Compliance status (known violation backlog)

As of the latest snapshot, ESLint reports **~521 violations** across the codebase. These are pre-existing patterns from before the primitives existed. The pre-commit hook prevents *new* violations; the backlog is paid down opportunistically when files are touched.

Top violation-dense files (work top-down):

| File | Violations | Type |
|---|---|---|
| `components/risk/RiskWorkflowPanel.tsx` | 60 | Modals + forms |
| `pages/QuestionnaireDetail.tsx` | 38 | Modals + forms |
| `pages/PolicyDetail.tsx` | 38 | 4 modals + forms |
| `pages/RiskDetail.tsx` | 32 | 5 modals + forms |
| `pages/ControlDetail.tsx` | 31 | 2 modals + forms |
| `components/controls/CollectorConfigModal.tsx` | 30 | Form |
| `pages/Integrations.tsx` | 27 | 2 modals + forms |
| `pages/FrameworkDetail.tsx` | 25 | 2 modals + forms |
| `pages/AssessmentDetail.tsx` | 25 | Form |
| `pages/TrustCenter.tsx` | 24 | 2 modals + forms |

By category: 133 raw `<input>`, 98 dark card chrome, 77 hand-rolled buttons, 58 raw `<select>`, 57 raw `<textarea>`, 48 hand-rolled modals, 32 legacy badge classes.

Get the live count and breakdown:

```bash
cd frontend
npm run lint 2>&1 | grep -oE "Use <[^>]+>|Do not use|Hand-rolled|Card chrome" | sort | uniq -c | sort -rn
```

Get the per-file backlog:

```bash
cd frontend
npx eslint src --ext ts,tsx -f compact 2>&1 | grep -oE "src/[^:]+" | sort | uniq -c | sort -rn | head -20
```

---

## 8. Rollback / snapshot procedure

Known-good snapshots are written to `/tmp/grc-known-good-<UTC-timestamp>.tar.gz`. The latest path is in `/tmp/grc-known-good-latest.txt`.

### Save a snapshot

```bash
SNAP="/tmp/grc-known-good-$(date -u +%Y%m%dT%H%M%SZ).tar.gz"
tar -czf "$SNAP" -C /Users/chad.fryer/gigachad-grc/frontend src .eslintrc.cjs tailwind.config.js
echo "$SNAP" > /tmp/grc-known-good-latest.txt
```

### Restore the latest snapshot

```bash
SNAP=$(cat /tmp/grc-known-good-latest.txt)
cd /Users/chad.fryer/gigachad-grc/frontend
rm -rf src && tar -xzf "$SNAP"
```

Restores `frontend/src/`, `.eslintrc.cjs`, and `tailwind.config.js`. Does not touch `node_modules` or `package.json`.

---

## 9. Quick reference: how to find things

| I want to… | Look at |
|---|---|
| See every primitive live | `/design-system` route in the app |
| Find a primitive's props | `frontend/src/components/ui/<Name>.tsx` |
| Change a color globally | `frontend/tailwind.config.js` |
| Change a status → color mapping | `frontend/src/lib/riskStatus.ts` (or `categoryStyle.ts`) |
| Add a new category color | `EXPLICIT` map in `frontend/src/lib/categoryStyle.ts` |
| See the lint rules | `frontend/.eslintrc.cjs` |
| Find all design-system violations | `cd frontend && npm run lint` |
