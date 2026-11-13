/**
 * Google sign-in uses google-auth-library's OAuth2Client (routes/auth.ts).
 * The route tests mock the library, so this test runs the real, unmocked
 * verification path offline: a token signed with a throwaway RSA key is
 * checked against that key's certificate the way verifyIdToken checks
 * Google's. It catches an upgrade that changes the API or breaks loading.
 */
import { generateKeyPairSync, createSign } from 'crypto';
import { OAuth2Client } from 'google-auth-library';

const CLIENT_ID = 'test-client.apps.googleusercontent.com';
const KID = 'test-key';
const { privateKey, publicKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
const certs = { [KID]: publicKey.export({ type: 'spki', format: 'pem' }).toString() };

const b64url = (value: object | Buffer) =>
  (Buffer.isBuffer(value) ? value : Buffer.from(JSON.stringify(value))).toString('base64url');

function signToken(claims: Record<string, unknown>): string {
  const now = Math.floor(Date.now() / 1000);
  const body = `${b64url({ alg: 'RS256', typ: 'JWT', kid: KID })}.${b64url({
    iss: 'https://accounts.google.com', aud: CLIENT_ID, iat: now, exp: now + 600, ...claims,
  })}`;
  const signature = createSign('RSA-SHA256').update(body).sign(privateKey);
  return `${body}.${b64url(signature)}`;
}

describe('google-auth-library ID token verification (unmocked)', () => {
  const client = new OAuth2Client(CLIENT_ID);

  it('accepts a correctly signed token and returns its payload', async () => {
    const ticket = await client.verifySignedJwtWithCertsAsync(
      signToken({ sub: '123', email: 'person@example.test', email_verified: true }), certs, CLIENT_ID,
    );
    expect(ticket.getPayload()).toMatchObject({ sub: '123', email: 'person@example.test' });
  });

  it('refuses a token for another client', async () => {
    await expect(client.verifySignedJwtWithCertsAsync(signToken({ sub: '1', aud: 'someone-else' }), certs, CLIENT_ID))
      .rejects.toThrow(/audience/i);
  });

  it('refuses a token whose signature was changed', async () => {
    const [h, p] = signToken({ sub: '1' }).split('.');
    await expect(client.verifySignedJwtWithCertsAsync(`${h}.${p}.${b64url(Buffer.from('forged'))}`, certs, CLIENT_ID))
      .rejects.toThrow();
  });

  it('keeps the verifyIdToken method routes/auth.ts calls', () => {
    expect(typeof client.verifyIdToken).toBe('function');
  });
});
