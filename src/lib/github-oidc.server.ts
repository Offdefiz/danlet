import { createPublicKey, verify } from 'node:crypto';

/** Authenticate ONLY the published main-branch Duet scheduler.
 * JWT signatures are checked against GitHub's official OIDC signing keys.
 * No static shared secret or external identity broker is required. */
const ISSUER = 'https://token.actions.githubusercontent.com';
const KEY_URL = ISSUER + '/.well-known/jwks';
export const DUET_OIDC_AUDIENCE = 'duet-render-cron';
const REPO = 'Offdefiz/danlet';
const WORKFLOW = REPO + '/.github/workflows/duet-reminders.yml@refs/heads/main';
type Json = Record<string, unknown>;
type Jwk = Json & { kid?: string; kty?: string; alg?: string; use?: string };
let cache: { keys: Jwk[]; expiry: number } | null = null;
function object(value: unknown): value is Json {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}
function parseSegment(segment: string): Json | null {
  try {
    const text = Buffer.from(segment, 'base64url').toString('utf8');
    const parsed: unknown = JSON.parse(text);
    return object(parsed) ? parsed : null;
  } catch { return null; }
}
async function signingKeys(): Promise<Jwk[]> {
  if (cache && Date.now() < cache.expiry) return cache.keys;
  const response = await fetch(KEY_URL, { signal: AbortSignal.timeout(6500), headers: { Accept: 'application/json' } });
  if (!response.ok) throw new Error('Não foi possível verificar a identidade do agendador.');
  const data: unknown = await response.json();
  if (!object(data) || !Array.isArray(data['keys'])) throw new Error('Chaves de verificação indisponíveis.');
  const keys = data['keys'].filter((v: unknown): v is Jwk => object(v) && v['kty'] === 'RSA' && typeof v['kid'] === 'string');
  if (!keys.length) throw new Error('Chaves de assinatura ausentes.');
  cache = { keys, expiry: Date.now() + 15 * 60_000 };
  return keys;
}
export async function verifyDuetSchedulerIdentity(token: string, now = Math.floor(Date.now() / 1000)): Promise<boolean> {
  if (token.length > 15000) return false;
  const pieces = token.split('.');
  if (pieces.length !== 3 || pieces.some(p => !p || !/^[A-Za-z0-9_-]+$/.test(p))) return false;
  const [headerText, payloadText, signatureText] = pieces as [string, string, string];
  const header = parseSegment(headerText), payload = parseSegment(payloadText);
  if (!header || !payload || header['alg'] !== 'RS256' || typeof header['kid'] !== 'string' || header['kid'].length > 256) return false;
  const iat = payload['iat'], exp = payload['exp'], nbf = payload['nbf'];
  if (typeof iat !== 'number' || typeof exp !== 'number'
      || !Number.isInteger(iat) || !Number.isInteger(exp)
      || iat > now + 45 || exp < now - 15 || exp - iat > 600
      || (nbf !== undefined && (typeof nbf !== 'number' || nbf > now + 45))) return false;
  if (payload['iss'] !== ISSUER
    || payload['aud'] !== DUET_OIDC_AUDIENCE
    || payload['repository'] !== REPO
    || payload['ref'] !== 'refs/heads/main'
    || payload['workflow_ref'] !== WORKFLOW
    || payload['sub'] !== 'repo:' + REPO + ':ref:refs/heads/main'
    || (payload['event_name'] !== 'schedule' && payload['event_name'] !== 'workflow_dispatch')) return false;
  try {
    const keys = await signingKeys();
    const key = keys.find(k => k.kid === header['kid'] && k.kty === 'RSA' && (k.use === undefined || k.use === 'sig') && (k.alg === undefined || k.alg === 'RS256'));
    if (!key) return false;
    const publicKey = createPublicKey({ key: key as Parameters<typeof createPublicKey>[0] & Json, format: 'jwk' });
    return verify('RSA-SHA256', Buffer.from(headerText + '.' + payloadText), publicKey, Buffer.from(signatureText, 'base64url'));
  } catch { return false; }
}
