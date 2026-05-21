import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import eslintConfigPrettier from 'eslint-config-prettier';
import globals from 'globals';

// Design-system conformance rules. These prevent drift from the @/components/ui
// primitives. Each rule produces a clear message pointing to the primitive to use.
// Suppress at a specific site with `// eslint-disable-next-line no-restricted-syntax`
// and a comment explaining the intentional exception.
const designSystemRules = [
  // 1. Legacy `.btn-*` CSS classes
  {
    selector:
      'JSXAttribute[name.name="className"] Literal[value=/\\bbtn(-(primary|secondary|outline|ghost|danger))?\\b/]',
    message:
      'Do not use legacy `.btn-*` CSS classes. Use <Button variant="..."> from @/components/ui.',
  },
  // 2. Legacy `.badge-*` CSS classes
  {
    selector:
      'JSXAttribute[name.name="className"] Literal[value=/\\bbadge(-(success|warning|danger|info|neutral))?\\b/]',
    message:
      'Do not use legacy `.badge-*` CSS classes. Use <Badge variant="..."> from @/components/ui.',
  },
  // 3. Hand-rolled centered-modal pattern. Catches both:
  //    - `fixed inset-0 ... flex ... items-center ... justify-center` (classic)
  //    - `fixed inset-0 ... grid place-items-center` (the codemod-era shortcut)
  //    Bare `fixed inset-0` for layout chrome / scroll containers /
  //    HUI-Dialog-backed primitives is still allowed.
  {
    selector:
      'JSXAttribute[name.name="className"] Literal[value=/\\bfixed\\s+inset-0\\b.*\\bflex\\b.*\\bitems-center\\b.*\\bjustify-center\\b/]',
    message:
      'Do not hand-roll centered modal overlays. Use <Dialog open={...} onClose={...}> from @/components/ui.',
  },
  {
    selector:
      'JSXAttribute[name.name="className"] Literal[value=/\\bfixed\\s+inset-0\\b.*\\bgrid\\s+place-items-center\\b/]',
    message:
      'Do not hand-roll centered modal overlays with `grid place-items-center`. Use <Dialog open={...} onClose={...}> from @/components/ui.',
  },
  // 4. Faint text colors on the light cream background
  {
    selector:
      'JSXAttribute[name.name="className"] Literal[value=/\\btext-(green|yellow|red|blue|orange|purple|teal|cyan|indigo|emerald|sky|violet|amber|fuchsia|lime|rose|surface)-(300|400)\\b/]',
    message:
      'Text-300/400 shades are unreadable on the cream background. Use 600-800 for text or `text-surface-500` for muted.',
  },
  // 5. `rounded-full` on what looks like a text pill (has px-* and bg-*-* together)
  {
    selector:
      'JSXAttribute[name.name="className"] Literal[value=/\\brounded-full\\b.*\\bpx-[0-9.]+\\b.*\\bbg-/]',
    message:
      '`rounded-full` is for avatars and dots only. Use <Badge> with `rounded-md` for text pills.',
  },
  // 6. Hand-rolled colored pill (px-2 py-0.5/1 rounded + colored bg with /opacity)
  {
    selector:
      'JSXAttribute[name.name="className"] Literal[value=/\\bpx-2\\s+py-(0\\.5|1)\\s+rounded.*\\bbg-(emerald|amber|red|blue|sky|indigo|violet|purple|teal|cyan|brand|accent)-(50|100|500)\\b/]',
    message:
      'Hand-rolled colored pill. Use <Badge variant="..."> or <CategoryChip value="..."> from @/components/ui.',
  },
  // 7. Card chrome on dark surface
  {
    selector:
      'JSXAttribute[name.name="className"] Literal[value=/\\bbg-surface-(100|200)\\b.*\\brounded(-md|-lg|-xl)\\b.*\\bborder\\b/]',
    message:
      'Card chrome on dark surface. Use <Card> or `bg-white border border-surface-200 rounded-lg`.',
  },
  // 8. Raw <input> for text-style inputs — use <Input> from @/components/ui
  {
    selector:
      'JSXOpeningElement[name.name="input"][attributes.length>=1] JSXAttribute[name.name="type"] Literal[value=/^(text|email|number|date|datetime-local|password|tel|url|search|time|week|month)$/]',
    message:
      'Use <Input> from @/components/ui instead of raw <input>. Raw <input> is allowed only for file/checkbox/radio/hidden types.',
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
];

export default [
  // Ignore patterns
  {
    ignores: ['dist/**', 'node_modules/**', 'playwright-report/**', 'coverage/**'],
  },

  // Base ESLint recommended
  eslint.configs.recommended,

  // TypeScript rules
  ...tseslint.configs.recommended,

  // React-specific configuration
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: {
        ...globals.browser,
      },
      parserOptions: {
        ecmaFeatures: {
          jsx: true,
        },
      },
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': 'off',
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
        },
      ],
      '@typescript-eslint/no-explicit-any': 'off',
      'react-hooks/exhaustive-deps': 'off',
    },
  },

  // Design-system conformance — enforced as errors. Every page conforms.
  {
    files: ['src/**/*.{ts,tsx}'],
    ignores: [
      'src/pages/DesignSystem.tsx', // intentional showcase of all patterns
      'src/components/ui/**', // the primitives themselves implement what the rules forbid in consumers
    ],
    rules: {
      'no-restricted-syntax': ['error', ...designSystemRules],
    },
  },

  // Playwright e2e test configuration
  {
    files: ['e2e/**/*.spec.ts'],
    languageOptions: {
      globals: {
        test: 'readonly',
        expect: 'readonly',
        page: 'readonly',
        browser: 'readonly',
        context: 'readonly',
      },
    },
    rules: {
      // Playwright's test.beforeEach / beforeAll signatures take a fixtures
      // object as the first argument; when no fixtures are needed the
      // idiomatic form is `({}, testInfo) => {}`. The runtime parser
      // enforces destructuring — `(_, testInfo)` throws
      // "First argument must use the object destructuring pattern".
      'no-empty-pattern': 'off',
    },
  },

  // Disable rules that conflict with Prettier
  eslintConfigPrettier,
];
