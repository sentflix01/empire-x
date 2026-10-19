/**
 * Every email follows one rule: Resend only when its key is set (falling back
 * to SMTP if Resend fails), otherwise SMTP. A leftover or broken Resend key
 * must never stop login codes.
 */
const sendMail = jest.fn().mockResolvedValue({});
jest.mock('nodemailer', () => ({ __esModule: true, default: { createTransport: () => ({ sendMail }) }, createTransport: () => ({ sendMail }) }));
jest.mock('../lib/logger', () => ({ __esModule: true, default: { warn: jest.fn(), info: jest.fn(), error: jest.fn() } }));

import { sendCustomEmail, sendOtpEmail } from '../utils/mailer';

const ENV = { ...process.env };
const fetchMock = jest.fn();

beforeEach(() => {
  process.env = { ...ENV, NODE_ENV: 'production', EMAIL_FROM: 'NodBusiness <nodbusinesses@gmail.com>' };
  delete process.env.RESEND_API_KEY;
  delete process.env.SMTP_HOST; delete process.env.SMTP_USER; delete process.env.SMTP_PASS;
  sendMail.mockClear();
  fetchMock.mockReset();
  (global as unknown as { fetch: jest.Mock }).fetch = fetchMock;
});
afterAll(() => { process.env = ENV; });

const smtp = () => Object.assign(process.env, { SMTP_HOST: 'smtp.gmail.com', SMTP_USER: 'nodbusinesses@gmail.com', SMTP_PASS: 'app-password' });

describe('email provider rule', () => {
  it('without a Resend key, codes and digests go straight to SMTP (Resend never called)', async () => {
    smtp();
    await sendOtpEmail('user@example.test', '123456');
    await sendCustomEmail('owner@example.test', 'Weekly digest', '<p>hi</p>');
    expect(fetchMock).not.toHaveBeenCalled();
    expect(sendMail).toHaveBeenCalledTimes(2);
    expect(sendMail.mock.calls[0][0]).toMatchObject({ to: 'user@example.test', from: 'NodBusiness <nodbusinesses@gmail.com>' });
  });

  it('a failing Resend key falls back to SMTP for login codes too', async () => {
    smtp();
    process.env.RESEND_API_KEY = 're_broken';
    fetchMock.mockResolvedValue({ ok: false, statusText: 'Unauthorized', json: async () => ({ message: 'API key is invalid' }) });
    await sendOtpEmail('user@example.test', '123456');
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(sendMail).toHaveBeenCalledTimes(1);
  });

  it('a working Resend key sends through Resend only', async () => {
    smtp();
    process.env.RESEND_API_KEY = 're_ok';
    fetchMock.mockResolvedValue({ ok: true, json: async () => ({ id: 'e1' }) });
    await sendCustomEmail('owner@example.test', 'Hi', '<p>hi</p>');
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(sendMail).not.toHaveBeenCalled();
  });

  it('Resend failing with no SMTP set reports the Resend error', async () => {
    process.env.RESEND_API_KEY = 're_broken';
    fetchMock.mockResolvedValue({ ok: false, statusText: 'Unauthorized', json: async () => ({ message: 'API key is invalid' }) });
    await expect(sendCustomEmail('owner@example.test', 'Hi', '<p>hi</p>')).rejects.toThrow('API key is invalid');
  });

  it('no provider at all in production is an error, not a silent drop', async () => {
    await expect(sendCustomEmail('owner@example.test', 'Hi', '<p>hi</p>')).rejects.toThrow(/not configured/);
  });
});
