// Stable color mapping for category-style chips.
// Used wherever a category (control category, evidence category, etc.) renders
// as a chip — gives the page visual variety without overloading status colors.
// All combinations are tested for AA contrast on the off-white page background.

const PALETTE = [
  { bg: 'bg-indigo-50', text: 'text-indigo-800', border: 'border-indigo-200' },
  { bg: 'bg-sky-50', text: 'text-sky-800', border: 'border-sky-200' },
  { bg: 'bg-teal-50', text: 'text-teal-800', border: 'border-teal-200' },
  { bg: 'bg-emerald-50', text: 'text-emerald-800', border: 'border-emerald-200' },
  { bg: 'bg-lime-50', text: 'text-lime-800', border: 'border-lime-300' },
  { bg: 'bg-amber-50', text: 'text-amber-800', border: 'border-amber-200' },
  { bg: 'bg-orange-50', text: 'text-orange-800', border: 'border-orange-200' },
  { bg: 'bg-rose-50', text: 'text-rose-800', border: 'border-rose-200' },
  { bg: 'bg-fuchsia-50', text: 'text-fuchsia-800', border: 'border-fuchsia-200' },
  { bg: 'bg-violet-50', text: 'text-violet-800', border: 'border-violet-200' },
  { bg: 'bg-cyan-50', text: 'text-cyan-800', border: 'border-cyan-200' },
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
