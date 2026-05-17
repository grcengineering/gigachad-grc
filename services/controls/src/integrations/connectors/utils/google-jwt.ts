import * as crypto from 'crypto';

export interface GoogleServiceAccountKey {
  type: string;
  project_id: string;
  private_key_id: string;
  private_key: string;
  client_email: string;
  client_id?: string;
  token_uri?: string;
}

export interface GoogleJwtOptions {
  scope: string;
  subject?: string;
  audience?: string;
  expirySeconds?: number;
}

function base64UrlEncode(input: Buffer | string): string {
  const buf = typeof input === 'string' ? Buffer.from(input) : input;
  return buf.toString('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
}

export function createGoogleServiceAccountJwt(
  credentials: GoogleServiceAccountKey,
  options: GoogleJwtOptions,
): string {
  if (!credentials.private_key || !credentials.client_email) {
    throw new Error('Service account key missing private_key or client_email');
  }

  const now = Math.floor(Date.now() / 1000);
  const exp = now + (options.expirySeconds ?? 3600);
  const audience = options.audience ?? credentials.token_uri ?? 'https://oauth2.googleapis.com/token';

  const header = { alg: 'RS256', typ: 'JWT', kid: credentials.private_key_id };
  const claims: Record<string, unknown> = {
    iss: credentials.client_email,
    scope: options.scope,
    aud: audience,
    iat: now,
    exp,
  };
  if (options.subject) {
    claims.sub = options.subject;
  }

  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedClaims = base64UrlEncode(JSON.stringify(claims));
  const signingInput = `${encodedHeader}.${encodedClaims}`;

  const signer = crypto.createSign('RSA-SHA256');
  signer.update(signingInput);
  const signature = signer.sign(credentials.private_key);

  return `${signingInput}.${base64UrlEncode(signature)}`;
}

export async function exchangeGoogleJwtForAccessToken(
  jwt: string,
  tokenUri = 'https://oauth2.googleapis.com/token',
): Promise<string> {
  const response = await fetch(tokenUri, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt,
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Google token exchange failed: ${response.status} ${text}`);
  }

  const data = (await response.json()) as { access_token?: string };
  if (!data.access_token) {
    throw new Error('Google token exchange returned no access_token');
  }
  return data.access_token;
}

export function parseServiceAccountKey(raw: string): GoogleServiceAccountKey {
  let parsed: GoogleServiceAccountKey;
  try {
    parsed = JSON.parse(raw) as GoogleServiceAccountKey;
  } catch (error: any) {
    throw new Error(`Service account key is not valid JSON: ${error.message}`);
  }
  if (!parsed.private_key || !parsed.client_email) {
    throw new Error('Service account key missing required fields');
  }
  return parsed;
}
