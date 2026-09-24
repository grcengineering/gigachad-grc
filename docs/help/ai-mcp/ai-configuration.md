# AI configuration

AI-backed features require an implemented provider path, provider credentials, and outbound network access.

## Provider configuration

The main controls AI service recognizes OpenAI and Anthropic provider credentials:

```env
OPENAI_API_KEY=<secret>
# or
ANTHROPIC_API_KEY=<secret>
```

Provider and model preferences can also be stored in organization settings where the relevant UI/API supports them.

Do not assume every module uses the same provider service. Controls, framework mapping, TPRM document analysis, trust, audit, and MCP packages contain separate code paths with different availability and fallback behavior.

## Explicit mock mode

For non-production demonstrations:

```env
AI_MOCK_MODE=true
```

The main controls and framework-mapping services only use mock output when this flag is explicitly enabled outside production. Production ignores or rejects this mode.

When exposed by a response, verify:

```json
{
  "isMockMode": true,
  "mockModeReason": "AI_MOCK_MODE is enabled"
}
```

Mock output is not an assessment, finding, or recommendation suitable for compliance evidence.

## No-provider behavior

Without a provider and without explicit mock mode:

- the main controls AI status reports not configured;
- framework mapping suggestions return unavailable;
- other module-specific paths may return an error or clearly labeled demo response.

Because behavior differs by module, always inspect `isMockMode`, `mockModeReason`, logs, and the relevant module documentation. A successful HTTP response does not prove a real provider was called.

## Security and privacy

Before enabling AI:

1. identify which fields are sent to the provider;
2. exclude secrets, credentials, and unnecessary personal data;
3. review provider retention and training terms;
4. select an approved region/account;
5. restrict and rotate API keys;
6. configure spend/rate limits; and
7. require human review of output.

## MCP packages

The packages under `mcp-servers/` are not started by the default Docker Compose stack. They require separate build, runtime, transport, and credential configuration.

Do not describe MCP tools as available in the default application unless your deployment separately runs and connects them.

## Verify real-provider use

For each enabled feature:

1. remove `AI_MOCK_MODE`;
2. configure one provider;
3. restart the relevant service;
4. check provider status;
5. send non-sensitive test content;
6. confirm provider-side request/usage logs; and
7. verify the response is not marked mock.

## Troubleshooting

### AI unavailable

Check the provider key, selected provider/model, outbound HTTPS, provider account quota, and service logs.

### Mock output appears unexpectedly

Check the effective container environment:

```bash
docker compose exec controls sh -c 'printf "%s\n" "$NODE_ENV" "$AI_MOCK_MODE"'
```

Never print provider API keys.

### One module works and another does not

They may use separate AI implementations or environment variables. Verify the specific service and endpoint rather than assuming platform-wide configuration.
