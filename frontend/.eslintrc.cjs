/* eslint-env node */
module.exports = {
  root: true,
  env: { browser: true, es2020: true, node: true },
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:react-hooks/recommended',
  ],
  ignorePatterns: [
    'dist',
    'build',
    'node_modules',
    '.eslintrc.cjs',
    'tailwind.config.js',
    'postcss.config.js',
    'test-*.mjs',
    'check-*.mjs',
    'playwright.config.ts',
    'src/pages/DesignSystem.tsx', // intentional showcase of all patterns
    'src/components/ui/**',       // the primitives themselves implement the patterns the rules forbid in consumers
  ],
  parser: '@typescript-eslint/parser',
  parserOptions: { ecmaVersion: 'latest', sourceType: 'module' },
  rules: {
    '@typescript-eslint/no-explicit-any': 'off',
    '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],

    // ============================================================
    // Design-system conformance rules.
    // These prevent drift from the @/components/ui primitives.
    // Suppress at a specific site with `// eslint-disable-next-line no-restricted-syntax`
    // and a comment explaining the intentional exception (e.g., HTTP method chip).
    // ============================================================
    'no-restricted-syntax': [
      'error',
      // 1. Legacy `.btn-*` CSS classes
      {
        selector: 'JSXAttribute[name.name="className"] Literal[value=/\\bbtn(-(primary|secondary|outline|ghost|danger))?\\b/]',
        message: 'Do not use legacy `.btn-*` CSS classes. Use <Button variant="..."> from @/components/ui.',
      },
      // 2. Legacy `.badge-*` CSS classes
      {
        selector: 'JSXAttribute[name.name="className"] Literal[value=/\\bbadge(-(success|warning|danger|info|neutral))?\\b/]',
        message: 'Do not use legacy `.badge-*` CSS classes. Use <Badge variant="..."> from @/components/ui.',
      },
      // 3. Hand-rolled centered-modal pattern (fixed inset-0 + flex centering — the
      //    classic ad-hoc modal). Bare `fixed inset-0` for layout chrome / scroll
      //    containers / HUI-Dialog-backed primitives is allowed.
      {
        selector: 'JSXAttribute[name.name="className"] Literal[value=/\\bfixed\\s+inset-0\\b.*\\bflex\\b.*\\bitems-center\\b.*\\bjustify-center\\b/]',
        message: 'Do not hand-roll centered modal overlays. Use <Dialog open={...} onClose={...}> from @/components/ui.',
      },
      // 4. Faint text colors on the light cream background
      {
        selector: 'JSXAttribute[name.name="className"] Literal[value=/\\btext-(green|yellow|red|blue|orange|purple|teal|cyan|indigo|emerald|sky|violet|amber|fuchsia|lime|rose|surface)-(300|400)\\b/]',
        message: 'Text-300/400 shades are unreadable on the cream background. Use 600-800 for text or `text-surface-500` for muted.',
      },
      // 5. `rounded-full` on what looks like a text pill (has px-* and bg-*-* together)
      {
        selector: 'JSXAttribute[name.name="className"] Literal[value=/\\brounded-full\\b.*\\bpx-[0-9.]+\\b.*\\bbg-/]',
        message: '`rounded-full` is for avatars and dots only. Use <Badge> with `rounded-md` for text pills.',
      },
      // 6. Hand-rolled colored pill (px-2 py-0.5/1 rounded + colored bg with /opacity)
      {
        selector: 'JSXAttribute[name.name="className"] Literal[value=/\\bpx-2\\s+py-(0\\.5|1)\\s+rounded.*\\bbg-(emerald|amber|red|blue|sky|indigo|violet|purple|teal|cyan|brand|accent)-(50|100|500)\\b/]',
        message: 'Hand-rolled colored pill. Use <Badge variant="..."> or <CategoryChip value="..."> from @/components/ui.',
      },
      // 7. Card chrome on dark surface
      {
        selector: 'JSXAttribute[name.name="className"] Literal[value=/\\bbg-surface-(100|200)\\b.*\\brounded(-md|-lg|-xl)\\b.*\\bborder\\b/]',
        message: 'Card chrome on dark surface. Use <Card> or `bg-white border border-surface-200 rounded-lg`.',
      },
      // 8. Raw <input> for text-style inputs — use <Input> from @/components/ui
      {
        selector: 'JSXOpeningElement[name.name="input"][attributes.length>=1] JSXAttribute[name.name="type"] Literal[value=/^(text|email|number|date|datetime-local|password|tel|url|search|time|week|month)$/]',
        message: 'Use <Input> from @/components/ui instead of raw <input>. Raw <input> is allowed only for file/checkbox/radio/hidden types.',
      },
      // 9. Raw <select> — use <Select>
      {
        selector: 'JSXOpeningElement[name.name="select"]',
        message: 'Use <Select> from @/components/ui instead of raw <select>.',
      },
      // 10. Raw <textarea> — use <Textarea>
      {
        selector: 'JSXOpeningElement[name.name="textarea"]',
        message: 'Use <Textarea> from @/components/ui instead of raw <textarea>.',
      },
    ],
  },
};
