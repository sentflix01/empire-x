'use client';
/**
 * Two-factor sign-in settings (audit F-017): turn it on with an
 * authenticator app, save recovery codes, replace them, or turn it off.
 */
import React, { useCallback, useEffect, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { ShieldCheck, ChevronRight, Loader2, Copy, Download } from 'lucide-react';
import { toast } from 'sonner';
import client from '@/lib/api/client';
import { apiErrorMessage } from '@/lib/apiErrorMessage';

interface Status { enabled: boolean; pending: boolean; recovery_codes_left: number; setup_allowed: boolean; required: boolean; has_password: boolean }
type Step = 'idle' | 'password' | 'scan' | 'codes' | 'disable' | 'regenerate';

const field = 'w-full h-11 px-3 text-sm bg-secondary/50 border border-border/50 rounded-xl outline-none focus:ring-1 focus:ring-primary/40';
const primaryBtn = 'w-full h-11 bg-primary hover:bg-primary-hover disabled:opacity-50 text-primary-foreground text-sm font-semibold rounded-xl transition-colors';
const quietBtn = 'w-full h-11 border border-border/60 hover:bg-secondary/60 text-sm font-semibold rounded-xl transition-colors';

export default function TwoFactorSettings() {
  const [status, setStatus] = useState<Status | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [step, setStep] = useState<Step>('idle');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [setup, setSetup] = useState<{ secret: string; otpauth_url: string } | null>(null);
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try { setStatus((await client.get('/api/auth/mfa/status')).data as Status); } catch { setStatus(null); }
  }, []);
  useEffect(() => { void load(); }, [load]);

  const reset = () => { setStep('idle'); setPassword(''); setCode(''); setSetup(null); };

  const run = async (fn: () => Promise<void>, fallback: string) => {
    setBusy(true);
    try { await fn(); } catch (err) { toast.error(apiErrorMessage(err, fallback)); } finally { setBusy(false); }
  };

  const start = () => run(async () => {
    const { data } = await client.post('/api/auth/mfa/setup', { password: password || undefined });
    setSetup(data as { secret: string; otpauth_url: string });
    setPassword(''); setStep('scan');
  }, 'Could not start setup');

  const confirmCode = () => run(async () => {
    const { data } = await client.post('/api/auth/mfa/enable', { code: code.replace(/\D/g, '') });
    setRecoveryCodes((data as { recovery_codes: string[] }).recovery_codes);
    setCode(''); setSetup(null); setStep('codes');
    toast.success('Two-factor sign-in is on');
    await load();
  }, 'That code is not correct');

  const turnOff = () => run(async () => {
    await client.post('/api/auth/mfa/disable', { password: password || undefined, code: code.trim() });
    toast.success('Two-factor sign-in is off');
    reset(); await load();
  }, 'Could not turn off two-factor sign-in');

  const regenerate = () => run(async () => {
    const { data } = await client.post('/api/auth/mfa/recovery-codes', { code: code.replace(/\D/g, '') });
    setRecoveryCodes((data as { recovery_codes: string[] }).recovery_codes);
    setCode(''); setStep('codes');
    await load();
  }, 'That code is not correct');

  const codesText = recoveryCodes.join('\n');
  const copyCodes = async () => {
    try { await navigator.clipboard.writeText(codesText); toast.success('Copied'); } catch { toast.error('Copy failed; write them down instead'); }
  };
  const downloadCodes = () => {
    const url = URL.createObjectURL(new Blob([`Nodbusiness recovery codes\nEach code works once.\n\n${codesText}\n`], { type: 'text/plain' }));
    const a = document.createElement('a');
    a.href = url; a.download = 'nodbusiness-recovery-codes.txt'; a.click();
    URL.revokeObjectURL(url);
  };

  if (!status || (!status.setup_allowed && !status.enabled)) return null;

  const subtitle = status.enabled
    ? `On · ${status.recovery_codes_left} recovery code${status.recovery_codes_left === 1 ? '' : 's'} left`
    : status.required ? 'Required for admins — turn it on to use admin tools' : 'Off · use an authenticator app for extra protection';

  const passwordField = status.has_password && (
    <div>
      <label htmlFor="mfa-password" className="text-xs font-medium text-muted-foreground">Your password</label>
      <input id="mfa-password" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} className={`${field} mt-1`} />
    </div>
  );
  const codeField = (label: string, allowRecovery: boolean) => (
    <div>
      <label htmlFor="mfa-settings-code" className="text-xs font-medium text-muted-foreground">{label}</label>
      <input id="mfa-settings-code" value={code} onChange={(e) => setCode(e.target.value)} inputMode={allowRecovery ? 'text' : 'numeric'}
        autoComplete="one-time-code" maxLength={allowRecovery ? 32 : 7} placeholder={allowRecovery ? '123456 or xxxx-xxxx-xxxx' : '123456'}
        className={`${field} mt-1 font-mono tracking-widest`} />
    </div>
  );

  return (
    <div className="bg-card rounded-2xl border border-border/50 overflow-hidden mt-2">
      <button type="button" onClick={() => setExpanded((v) => !v)} aria-expanded={expanded}
        className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-secondary/40 transition-colors">
        <div className="w-9 h-9 rounded-xl bg-success-subtle flex items-center justify-center shrink-0">
          <ShieldCheck className="w-4 h-4 text-success" aria-hidden="true" />
        </div>
        <div className="flex-1 text-left">
          <p className="text-sm font-semibold">Two-factor sign-in</p>
          <p className="text-xs text-muted-foreground">{subtitle}</p>
        </div>
        <ChevronRight className={`w-4 h-4 text-muted-foreground transition-transform ${expanded ? 'rotate-90' : ''}`} aria-hidden="true" />
      </button>

      {expanded && (
        <div className="px-4 pb-4 pt-3 space-y-3 border-t border-border/40">
          {step === 'codes' && (
            <>
              <p className="text-sm">Save these recovery codes somewhere safe. Each one signs you in once if you lose your phone. They are shown only now.</p>
              <ul className="grid grid-cols-2 gap-2 rounded-xl bg-secondary/50 p-3 font-mono text-sm" aria-label="Recovery codes">
                {recoveryCodes.map((c) => <li key={c}>{c}</li>)}
              </ul>
              <div className="grid grid-cols-2 gap-2">
                <button type="button" onClick={copyCodes} className={quietBtn}><Copy className="mr-1.5 inline h-4 w-4" aria-hidden="true" />Copy</button>
                <button type="button" onClick={downloadCodes} className={quietBtn}><Download className="mr-1.5 inline h-4 w-4" aria-hidden="true" />Download</button>
              </div>
              <button type="button" onClick={() => { setRecoveryCodes([]); reset(); }} className={primaryBtn}>I saved them</button>
            </>
          )}

          {step === 'idle' && !status.enabled && (
            <>
              <p className="text-sm text-muted-foreground">After your password, you will also enter a code from an authenticator app (such as Google Authenticator, Microsoft Authenticator or 1Password).</p>
              <button type="button" onClick={() => (status.has_password ? setStep('password') : void start())} disabled={busy} className={primaryBtn}>Turn on</button>
            </>
          )}

          {step === 'password' && (
            <form onSubmit={(e) => { e.preventDefault(); void start(); }} className="space-y-3">
              {passwordField}
              <button type="submit" disabled={busy || !password} className={primaryBtn}>{busy ? <Loader2 className="mx-auto h-4 w-4 animate-spin" aria-hidden="true" /> : 'Continue'}</button>
              <button type="button" onClick={reset} className={quietBtn}>Cancel</button>
            </form>
          )}

          {step === 'scan' && setup && (
            <form onSubmit={(e) => { e.preventDefault(); void confirmCode(); }} className="space-y-3">
              <p className="text-sm">1. Scan this code with your authenticator app.</p>
              <div className="mx-auto w-fit rounded-xl bg-white p-3">
                <QRCodeSVG value={setup.otpauth_url} size={176} level="M" title="QR code for your authenticator app" />
              </div>
              <p className="text-xs text-muted-foreground">
                Can&apos;t scan? Enter this key in the app: <span className="break-all font-mono text-foreground">{setup.secret.match(/.{1,4}/g)?.join(' ')}</span>
              </p>
              <p className="text-sm">2. Enter the 6-digit code it shows.</p>
              {codeField('Code from the app', false)}
              <button type="submit" disabled={busy || code.replace(/\D/g, '').length !== 6} className={primaryBtn}>{busy ? <Loader2 className="mx-auto h-4 w-4 animate-spin" aria-hidden="true" /> : 'Turn on'}</button>
              <button type="button" onClick={reset} className={quietBtn}>Cancel</button>
            </form>
          )}

          {step === 'idle' && status.enabled && (
            <div className="grid gap-2">
              <button type="button" onClick={() => setStep('regenerate')} className={quietBtn}>New recovery codes</button>
              {status.required
                ? <p className="text-xs text-muted-foreground">Admins must keep two-factor sign-in on.</p>
                : <button type="button" onClick={() => setStep('disable')} className={`${quietBtn} text-destructive`}>Turn off</button>}
            </div>
          )}

          {step === 'regenerate' && (
            <form onSubmit={(e) => { e.preventDefault(); void regenerate(); }} className="space-y-3">
              <p className="text-sm text-muted-foreground">Your old recovery codes will stop working.</p>
              {codeField('Code from the app', false)}
              <button type="submit" disabled={busy || code.replace(/\D/g, '').length !== 6} className={primaryBtn}>Create new codes</button>
              <button type="button" onClick={reset} className={quietBtn}>Cancel</button>
            </form>
          )}

          {step === 'disable' && (
            <form onSubmit={(e) => { e.preventDefault(); void turnOff(); }} className="space-y-3">
              {passwordField}
              {codeField('Code from the app or a recovery code', true)}
              <button type="submit" disabled={busy || !code.trim() || (status.has_password && !password)} className={`${primaryBtn} bg-destructive hover:bg-destructive/90`}>Turn off two-factor sign-in</button>
              <button type="button" onClick={reset} className={quietBtn}>Cancel</button>
            </form>
          )}
        </div>
      )}
    </div>
  );
}
