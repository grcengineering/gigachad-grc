# UI Redesign — Phase 0 Decisions

This document captures locked-in design decisions for the GigaChad GRC UI redesign. Anyone touching the frontend should skim this first. Implementation plan lives at `~/.claude/plans/grc-ui-redesign.md`.

## Visual direction

**Reference shape:** Linear (shell, density, keyboard-first) + Vanta (domain-specific GRC patterns) + Stripe Dashboard (data tables, filter chips).

**Theme:** Dark-first. Light mode is deferred; do not add light-mode classes for now.

**Color usage:**

- `brand` (green) is reserved for: primary CTAs, active nav state, focus rings, key positive metrics. Do **not** use it as a generic accent.
- `surface` neutral scale carries everything else (backgrounds, borders, text).
- Semantic colors (`red`, `yellow`, `green`, `blue` Tailwind defaults) only for status. Use the `Badge` variants, not raw classes.

**Typography:** Inter var (sans) + JetBrains Mono (mono). Scale is codified in `tailwind.config.js`:

- `text-display` 30px/36 / 600 — page heroes only
- `text-h1` 24px/32 / 600 — page titles
- `text-h2` 18px/28 / 600 — section headings
- `text-h3` 15px/22 / 600 — card/sub-section headings
- `text-body` 14px/20 / 400 — default body
- `text-small` 13px/18 / 400 — secondary text, table cells
- `text-xs` 12px/16 / 500 — labels, badges, meta

**Density:** Compact default. Tables/lists use `py-2.5` row padding; cards use `p-4`/`p-6` depending on density.

## Component library

**Primitives live in `src/components/ui/`.** Do not write new pages that re-implement what's in there — extend the primitive instead. Built on:

- `@headlessui/react` — Dialog, Menu, Combobox, Listbox, Tabs, Switch
- `cmdk` — command palette (Cmd+K)
- `@tanstack/react-table` — `DataTable`
- `lucide-react` and `@heroicons/react` — icons (prefer lucide for new code)
- `react-hot-toast` — toasts (`react-toastify` is removed)

**Naming:** PascalCase exports, file = component name. Import via path alias: `import { Button } from '@/components/ui/Button'`.

**Variants pattern:** All variant components take `variant` + `size` props, never raw `className` mixing. Use `cn()` helper from `@/lib/cn`.

## What we changed in tokens

- Removed `react-toastify` (was unused).
- Added codified typography scale (see above).
- Added `--ring-offset` variable to support consistent focus rings across surfaces.
- The `.btn` / `.card` / `.badge` legacy CSS-layer utilities are kept as escape hatches but **new code should use the React primitives**.

## What we are NOT doing (yet)

- **Light mode** — not until Phase 7. Don't add light variants.
- **Multi-tenant theming** — out of scope.
- **Trust Center marketing surface** — different audience, defer to a separate redesign.
- **Onboarding wizard** — deferred to Phase 6.

## Migration discipline

When converting a page to new primitives, the contract is:

1. **Behavior preserved.** No new features, no removed features unless explicitly stated in the commit.
2. **No raw `<select>`** — always Combobox/Select primitive.
3. **No raw spinners on data-loading panels** — Skeleton.
4. **No empty list with no message** — EmptyState.
5. **No hand-rolled table styling** — DataTable.
6. **No `.btn-*` classes in new code** — Button component.

If a primitive is missing a needed variant, add the variant to the primitive in the same PR — don't fork.

## Open follow-ups

- Persona task-journey worksheet (needs user research; defer until we have signal from users).
- Light mode (Phase 7).
- Saved views server persistence (needs backend work; first ship URL-driven filters).
- White-label theming (only if/when a customer asks).
