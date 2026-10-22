import { createHash, createSign } from 'node:crypto';
import { readFileSync } from 'node:fs';

/** Firebase HTTP v1 OAuth, with credentials controlled by the project owner.
 * No Lovable connector gateway and no Google SDK/runtime dependency. */
type ServiceAccount = { project_id: string; client_email: string; private_key: string };
let cached: { value: string; expires: number; key: string } | null = null;

function parseServiceAccount(json: string): ServiceAccount | null {
  try {
    const obj: unknown = JSON.parse(json);
    if (typeof obj !== 'object' || !obj) return null;
    const data = obj as Record<string, unknown>;
    if (typeof data['project_id'] !== 'string' || typeof data['client_email'] !== 'string' || typeof data['private_key'] !== 'string') return null;
    return { project_id: data['project_id'], client_email: data['client_email'], private_key: data['private_key'] };
  } catch { return null; }
}

export function firebaseCredentials(): ServiceAccount | null {
  const json = process.env['FIREBASE_SERVICE_ACCOUNT_JSON'];
  if (json) return parseServiceAccount(json);
  const file = process.env['FIREBASE_SERVICE_ACCOUNT_FILE'] || process.env['GOOGLE_APPLICATION_CREDENTIALS'];
  if (file) {
    try { return parseServiceAccount(readFileSync(file, 'utf8')); }
    catch { return null; }
  }
  const project_id = process.env['FIREBASE_PROJECT_ID'];
  const client_email = process.env['FIREBASE_CLIENT_EMAIL'];
  const private_key = process.env['FIREBASE_PRIVATE_KEY']?.replace(/\\n/g, '\n');
  return project_id && client_email && private_key ? { project_id, client_email, private_key } : null;
}
export function firebasePushConfigured(): boolean {
  const creds = firebaseCredentials();
  return !!(creds && /^[a-z][a-z0-9-]{4,62}$/.test(creds.project_id) && creds.private_key.includes('PRIVATE KEY'));
}
const encode = (data: object): string => Buffer.from(JSON.stringify(data)).toString('base64url');

export async function firebaseAccessToken(creds: ServiceAccount): Promise<string> {
  // Credential rotation must not reuse an access token from the previous key.
  const fingerprint = createHash('sha256').update(creds.private_key).digest('hex');
  const identity = creds.project_id + ':' + creds.client_email + ':' + fingerprint;
  if (cached && cached.key === identity && cached.expires - Date.now() > 120_000) return cached.value;
  const now = Math.floor(Date.now() / 1000);
  const tokenHeader = encode({ alg: 'RS256', typ: 'JWT' });
  const tokenClaims = encode({
    iss: creds.client_email, scope: 'https://www.googleapis.com/auth/firebase.messaging',
    aud: 'https://oauth2.googleapis.com/token', iat: now, exp: now + 3500,
  });
  const unsigned = tokenHeader + '.' + tokenClaims;
  let assertion: string;
  try {
    const sign = createSign('RSA-SHA256'); sign.update(unsigned); sign.end();
    assertion = unsigned + '.' + sign.sign(creds.private_key).toString('base64url');
  } catch { throw new Error('Não foi possível preparar a autenticação Firebase. Verifique a conta de serviço.'); }
  const body = new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion });
  let response: Response;
  try {
    response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body,
      signal: AbortSignal.timeout(12000),
    });
  } catch { throw new Error('Não foi possível conectar ao Firebase para autenticar o envio.'); }
  if (!response.ok) throw new Error('Não foi possível autenticar o Firebase (HTTP ' + response.status + '). Verifique a conta de serviço.');
  const json = await response.json().catch(() => null) as { access_token?: string; expires_in?: number } | null;
  if (!json || typeof json.access_token !== 'string' || !json.access_token) throw new Error('Firebase não retornou credencial de envio.');
  cached = { key: identity, value: json.access_token, expires: Date.now() + Math.max(60, json.expires_in ?? 3600) * 1000 };
  return json.access_token;
}
