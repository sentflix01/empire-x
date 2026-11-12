/** New-password rules (audit F-017, ASVS 5.0 V6.2). */
import fs from 'fs';
import path from 'path';
import { newPasswordProblem, isCommonPassword, assertPasswordPolicyReady } from '../lib/passwordPolicy';

describe('newPasswordProblem', () => {
  it('accepts a long, uncommon password', () => {
    expect(newPasswordProblem('violet-harbour-tram-91')).toBeNull();
  });

  it.each(['password', 'Password', 'PASSWORD', '12345678', 'qwertyuiop', 'iloveyou', 'trustno1', '1qaz2wsx'])('rejects the common password %s', (p) => {
    expect(newPasswordProblem(p)).toMatch(/too common/);
  });

  it('keeps the length limits', () => {
    expect(newPasswordProblem('short')).toMatch(/at least 8/);
    expect(newPasswordProblem('x'.repeat(129))).toMatch(/at most 128/);
  });

  it('rejects the email address or its local part', () => {
    expect(newPasswordProblem('Abebe.Kebede@example.test', { email: 'abebe.kebede@example.test' })).toMatch(/email/);
    expect(newPasswordProblem('abebe.kebede', { email: 'Abebe.Kebede@example.test' })).toMatch(/email/);
    expect(newPasswordProblem('abebe.kebede-coffee-2026', { email: 'abebe.kebede@example.test' })).toBeNull();
  });
});

describe('the blocklist file', () => {
  it('ships with the backend and loads', () => {
    expect(() => assertPasswordPolicyReady()).not.toThrow();
    const lines = fs.readFileSync(path.join(__dirname, '..', 'data', 'common-passwords.txt'), 'utf8').trim().split('\n');
    expect(lines.length).toBe(17950);
    expect(lines.every((l) => l.length >= 8 && l.length <= 128)).toBe(true);
    expect(fs.existsSync(path.join(__dirname, '..', 'data', 'common-passwords.NOTICE.md'))).toBe(true);
    expect(isCommonPassword('sunshine')).toBe(true);
  });

  it('is copied into the production image', () => {
    const dockerfile = fs.readFileSync(path.join(__dirname, '..', 'Dockerfile'), 'utf8');
    expect(dockerfile).toMatch(/COPY --from=builder \/app\/data \.\/dist\/data/);
  });
});
