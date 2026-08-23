/** copilot.ts — intent parser tests (pure logic, no IO) */
const { parseIntent, COPILOT_HELP } = require('../lib/copilot');

describe('parseIntent — slash commands', () => {
  test('help variants', () => {
    expect(parseIntent('/help')).toEqual({ intent: 'help' });
    expect(parseIntent('help')).toEqual({ intent: 'help' });
  });
  test('health/status', () => {
    expect(parseIntent('/health')).toEqual({ intent: 'health' });
    expect(parseIntent('status')).toEqual({ intent: 'health' });
  });
  test('errors with optional hour window, clamped', () => {
    expect(parseIntent('/errors')).toEqual({ intent: 'errors', hours: 24 });
    expect(parseIntent('/errors 6h')).toEqual({ intent: 'errors', hours: 6 });
    expect(parseIntent('/errors 9999')).toEqual({ intent: 'errors', hours: 720 });
  });
  test('resolve takes the fingerprint', () => {
    expect(parseIntent('/resolve abc123')).toEqual({ intent: 'resolve', fingerprint: 'abc123' });
    expect(parseIntent('resolve abc123')).toEqual({ intent: 'resolve', fingerprint: 'abc123' });
  });
  test('flag set on/off', () => {
    expect(parseIntent('/flag stripe_payments off')).toEqual({ intent: 'flag_set', flag: 'stripe_payments', enabled: false });
    expect(parseIntent('/flag stripe_payments on')).toEqual({ intent: 'flag_set', flag: 'stripe_payments', enabled: true });
    expect(parseIntent('turn off chapa_payments')).toEqual({ intent: 'flag_set', flag: 'chapa_payments', enabled: false });
  });
  test('backup', () => {
    expect(parseIntent('/backup')).toEqual({ intent: 'backup' });
    expect(parseIntent('run backup')).toEqual({ intent: 'backup' });
  });
  test('add items with | description separator', () => {
    expect(parseIntent('/bug Login 500s | on mobile after refresh')).toEqual({
      intent: 'add_item', kind: 'bug', title: 'Login 500s', description: 'on mobile after refresh',
    });
    expect(parseIntent('add feature: Dark mode | system-aware')).toEqual({
      intent: 'add_item', kind: 'feature', title: 'Dark mode', description: 'system-aware',
    });
  });
  test('done_item strips filler words', () => {
    expect(parseIntent('/done showroom chips')).toEqual({ intent: 'done_item', query: 'showroom chips' });
    expect(parseIntent('mark like state done')).toEqual({ intent: 'done_item', query: 'like state' });
  });
  test('unknown stays safe', () => {
    expect(parseIntent('')).toEqual({ intent: 'unknown' });
    expect(parseIntent('tell me a joke')).toEqual({ intent: 'unknown' });
  });
  test('help text lists every command', () => {
    expect(COPILOT_HELP).toContain('/health');
    expect(COPILOT_HELP).toContain('/resolve');
  });
});
