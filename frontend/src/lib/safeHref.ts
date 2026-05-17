// Parse a user-supplied URL and only return it if it's http/https. Anything
// else (javascript:, data:, vbscript:, file:, etc.) returns null, which causes
// callers to render the raw value as plain text instead of as a link. This
// prevents a vendor.website value like "javascript:alert(1)" from becoming
// an XSS sink when clicked.
export function safeHref(raw: string): string | null {
  try {
    const u = new URL(raw);
    return u.protocol === 'http:' || u.protocol === 'https:' ? u.toString() : null;
  } catch {
    return null;
  }
}
