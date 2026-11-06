'use client';
/**
 * Second sign-in step when two-factor sign-in is on (audit F-017): a 6-digit
 * code from an authenticator app, or a one-time recovery code.
 */
import React, { useEffect, useRef, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { auth } from '@/api/auth';
import { apiErrorBody, apiErrorMessage } from '@/lib/apiErrorMessage';

export interface MfaChallengeProps {
  mfaToken: string;
  onSignedIn: (result: Record<string, unknown>) => void | Promise<void>;
  /** The challenge expired or was used: go back to the password step. */
  onRestart: (message: string) => void;
}

export default function MfaChallenge({ mfaToken, onSignedIn, onRestart }: MfaChallengeProps) {
  const [useRecovery, setUseRecovery] = useState(false);
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => { input.current?.focus(); }, [useRecovery]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const value = useRecovery ? code.trim() : code.replace(/\D/g, '');
    if (!value) return;
    setBusy(true);
    setError('');
    try {
      const result = await auth.verifyMfa(mfaToken, value);
      await onSignedIn(result);
    } catch (err) {
      const body = apiErrorBody(err);
      if (body?.code === 'MFA_CHALLENGE_EXPIRED') { onRestart('That sign-in step expired. Enter your password again.'); return; }
      setError(apiErrorMessage(err, 'That code is not correct.'));
      setCode('');
      input.current?.focus();
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-4" aria-describedby="mfa-help">
      <p id="mfa-help" className="text-sm text-muted-foreground">
        {useRecovery
          ? 'Enter one of the recovery codes you saved when you turned on two-factor sign-in. Each code works once.'
          : 'Open your authenticator app and enter the 6-digit code for Nodbusiness.'}
      </p>
      {error && <p role="alert" className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}
      <div>
        <Label htmlFor="mfa-code">{useRecovery ? 'Recovery code' : 'Authentication code'}</Label>
        <Input
          ref={input}
          id="mfa-code"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          autoComplete={useRecovery ? 'off' : 'one-time-code'}
          inputMode={useRecovery ? 'text' : 'numeric'}
          pattern={useRecovery ? undefined : '[0-9 ]*'}
          maxLength={useRecovery ? 32 : 7}
          placeholder={useRecovery ? 'xxxx-xxxx-xxxx' : '123456'}
          className="mt-1 font-mono tracking-widest"
          required
        />
      </div>
      <Button type="submit" className="w-full" disabled={busy || !code.trim()}>
        {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : 'Verify'}
      </Button>
      <button type="button" onClick={() => { setUseRecovery((v) => !v); setCode(''); setError(''); }} className="w-full text-sm font-medium text-primary hover:underline">
        {useRecovery ? 'Use a code from your app instead' : 'Use a recovery code'}
      </button>
    </form>
  );
}
