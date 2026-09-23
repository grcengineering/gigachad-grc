'use strict';

/**
 * Jest-only compatibility shim.
 *
 * sanitize-html 2.17.7 depends on ESM-only htmlparser2 12. Jest 30 cannot
 * execute that CommonJS-to-ESM edge under Node 22 even though the production
 * Node runtime can. Product builds continue to use the real sanitizer.
 */
function sanitizeHtml(input, options = {}) {
  let value = String(input ?? '')
    .replace(/<script\b[^>]*>[\s\S]*?<\/script\s*>/gi, '')
    .replace(/<style\b[^>]*>[\s\S]*?<\/style\s*>/gi, '')
    .replace(/\s+on[a-z]+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, '')
    .replace(/\s+(href|src)\s*=\s*(["'])\s*(?:javascript|data):[\s\S]*?\2/gi, '');

  const allowedTags = Array.isArray(options.allowedTags) ? options.allowedTags : [];
  if (allowedTags.length === 0) {
    return value.replace(/<[^>]*>/g, '');
  }

  const allowed = new Set(allowedTags.map((tag) => String(tag).toLowerCase()));
  value = value.replace(/<\/?([a-z0-9-]+)\b[^>]*>/gi, (tag, name) =>
    allowed.has(String(name).toLowerCase()) ? tag : ''
  );
  return value;
}

sanitizeHtml.defaults = {
  allowedTags: [],
  allowedAttributes: {},
};

module.exports = sanitizeHtml;
module.exports.default = sanitizeHtml;
