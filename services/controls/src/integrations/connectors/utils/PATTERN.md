# Connector implementation pattern

Every integration connector in this directory must follow these rules. Reviewers should reject PRs that violate them.

## Auth

1. `testConnection` must actually verify credentials by calling an upstream endpoint. Never return `{ success: true }` based only on the presence of config fields.
2. If credentials are missing or malformed, return `{ success: false, message: '...' }` — never throw.
3. If credentials are present but auth fails, return `{ success: false, message: <upstream error> }`.
4. Auth helpers that require signing (JWT, HMAC, AWS SigV4) live in `./utils/`. Re-use them — do not paste inline.

## Data fetching

5. Every field declared in the connector's `SyncResult` interface must be either:
   - Fetched from a real upstream endpoint, OR
   - Removed from the interface.
6. **No hardcoded zero/empty fallbacks except in the catch path** of a real `await`. `return { devices: { total: 0 } }` without a preceding fetch attempt is a bug.
7. Security-relevant fields (`mfaEnabled`, `ssoEnabled`, `encryptionEnabled`, `passwordPolicy`, `branchProtection`, etc.) MUST be fetched. Returning `false` or `true` as a placeholder for these is misleading in a GRC product and will surface as a bogus finding.
8. If the upstream API doesn't expose a field that the interface declares, delete the field from the interface — don't hardcode a value.

## Error handling

9. `sync` should never throw at the top level. Catch errors at the per-endpoint level, accumulate them in the `errors: string[]` field of the result, and return partial data when possible.
10. Auth failures inside `sync` are an exception — those should throw, since no useful data can be collected.
11. Never wrap a successful response in a "this is mock data" notice. Either the data is real or the connector errors out.

## Pagination

12. Endpoints that return paginated data should paginate. A 100-item slice is not the dataset — it's a sample. Use a safety cap (e.g., `while (cursor && items.length < 5000)`) to avoid runaway loops.

## Testing

13. Each connector should have a unit test that mocks the upstream HTTP layer and verifies the shape of the returned data.
14. Tests should NOT call the real upstream. Use `nock` or `jest.fn()` over `fetch`/`axios`.

## What "done" looks like

- `npm run build` passes.
- All declared `SyncResult` fields are either fetched or removed.
- `testConnection` makes a real API call.
- No `// TODO`, `// Simulated`, `// Mock`, `// Would call X` comments left in the file.
- No `'jwt-token'`-style placeholder return values.
