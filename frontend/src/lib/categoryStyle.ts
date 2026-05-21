// Stable color mapping for category-style chips.
// Used wherever a category (control category, evidence category, etc.) renders
// as a chip — gives the page visual variety without overloading status colors.
// All combinations are tested for AA contrast on the off-white page background.

// Each entry pairs a light-mode set (bg-X-50/text-X-800/border-X-200) with
// a dark-mode counterpart (bg-X-900/40, text-X-200, border-X-800). Both
// directions are tested for AA contrast.
const PALETTE = [
  {
    bg: 'bg-indigo-50 dark:bg-indigo-900/40',
    text: 'text-indigo-800 dark:text-indigo-200',
    border: 'border-indigo-200 dark:border-indigo-800',
  },
  {
    bg: 'bg-sky-50 dark:bg-sky-900/40',
    text: 'text-sky-800 dark:text-sky-200',
    border: 'border-sky-200 dark:border-sky-800',
  },
  {
    bg: 'bg-teal-50 dark:bg-teal-900/40',
    text: 'text-teal-800 dark:text-teal-200',
    border: 'border-teal-200 dark:border-teal-800',
  },
  {
    bg: 'bg-emerald-50 dark:bg-emerald-900/40',
    text: 'text-emerald-800 dark:text-emerald-200',
    border: 'border-emerald-200 dark:border-emerald-800',
  },
  {
    bg: 'bg-lime-50 dark:bg-lime-900/40',
    text: 'text-lime-800 dark:text-lime-200',
    border: 'border-lime-300 dark:border-lime-800',
  },
  {
    bg: 'bg-amber-50 dark:bg-amber-900/40',
    text: 'text-amber-800 dark:text-amber-200',
    border: 'border-amber-200 dark:border-amber-800',
  },
  {
    bg: 'bg-orange-50 dark:bg-orange-900/40',
    text: 'text-orange-800 dark:text-orange-200',
    border: 'border-orange-200 dark:border-orange-800',
  },
  {
    bg: 'bg-rose-50 dark:bg-rose-900/40',
    text: 'text-rose-800 dark:text-rose-200',
    border: 'border-rose-200 dark:border-rose-800',
  },
  {
    bg: 'bg-fuchsia-50 dark:bg-fuchsia-900/40',
    text: 'text-fuchsia-800 dark:text-fuchsia-200',
    border: 'border-fuchsia-200 dark:border-fuchsia-800',
  },
  {
    bg: 'bg-violet-50 dark:bg-violet-900/40',
    text: 'text-violet-800 dark:text-violet-200',
    border: 'border-violet-200 dark:border-violet-800',
  },
  {
    bg: 'bg-cyan-50 dark:bg-cyan-900/40',
    text: 'text-cyan-800 dark:text-cyan-200',
    border: 'border-cyan-200 dark:border-cyan-800',
  },
];

// Explicit assignments for known categories / framework types so the most
// common ones are stable & semantically reasonable.
const EXPLICIT: Record<string, number> = {
  // Control / evidence categories
  access_control: 0, // indigo
  network_security: 10, // cyan
  data_protection: 1, // sky
  compliance: 3, // emerald
  business_continuity: 6, // orange
  change_management: 9, // violet
  human_resources: 7, // rose
  vulnerability_management: 5, // amber
  security_operations: 4, // lime
  application_security: 2, // teal
  privacy: 8, // fuchsia

  // Common framework types
  soc_2: 1, // sky
  soc2: 1,
  soc_2_type_ii: 1,
  iso_27001: 0, // indigo
  iso27001: 0,
  iso_27001_2022: 0,
  hipaa: 3, // emerald
  nist: 9, // violet
  nist_csf: 9,
  pci: 7, // rose
  pci_dss: 7,
  gdpr: 8, // fuchsia
  fedramp: 10, // cyan
  cmmc: 2, // teal
};

function hash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (h * 31 + s.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

export function categoryStyle(category: string | null | undefined): string {
  if (!category) return `${PALETTE[0].bg} ${PALETTE[0].text} ${PALETTE[0].border}`;
  const key = category.toLowerCase().replace(/[\s-]+/g, '_');
  const idx = key in EXPLICIT ? EXPLICIT[key] : hash(key) % PALETTE.length;
  const p = PALETTE[idx];
  return `${p.bg} ${p.text} ${p.border}`;
}

/** Full chip className for use on a <span>. Apply on top of any extra classes. */
export function categoryChipClass(category: string | null | undefined): string {
  return `inline-flex items-center whitespace-nowrap rounded-md border px-2 py-0.5 text-xs font-medium ${categoryStyle(category)}`;
}

/**
 * Normalize a free-text or snake_case label to Title Case. Lowercases first,
 * then uppercases the first letter of each word. Use this for chip labels so
 * "TYPE FW DBG", "type_fw_dbg", and "Type Fw Dbg" all render identically.
 *
 * Short acronyms (≤4 chars, all letters) are preserved verbatim so values like
 * "SOC", "ISO", "PCI", "GDPR" stay uppercase.
 */
export function toTitleCase(input: string | null | undefined): string {
  if (!input) return '';
  const cleaned = input.replace(/[_-]+/g, ' ').trim();
  return cleaned
    .split(/\s+/)
    .map((word) => {
      if (!word) return word;
      // Preserve known acronyms (all-letter, 2-4 chars, all upper in source).
      if (/^[A-Z]{2,4}$/.test(word)) return word;
      // Preserve mixed-case tokens that contain digits or non-letter chars
      // like "27001" or "2025-Q3".
      if (/[0-9]/.test(word)) return word;
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(' ');
}
