import { describe, it, expect } from 'vitest';
import { apiErrorBody, apiErrorMessage } from '@/lib/apiErrorMessage';

describe('apiErrorBody', () => {
  it('returns the body the api client interceptor rejects with', () => {
    const rejected = { error: 'Current password is incorrect', code: 'VALIDATION_ERROR', status: 422 };
    expect(apiErrorBody(rejected)).toEqual(rejected);
  });

  it('unwraps a raw axios error and keeps its status', () => {
    const axiosError = Object.assign(new Error('Request failed with status code 409'), {
      response: { status: 409, data: { error: 'business_profile_required', draftId: 'd1' } },
    });
    expect(apiErrorBody(axiosError)).toEqual({ error: 'business_profile_required', draftId: 'd1', status: 409 });
  });

  it('wraps a non-object response body', () => {
    expect(apiErrorBody({ response: { status: 502, data: 'Bad gateway' } })).toEqual({ error: 'Bad gateway', status: 502 });
    expect(apiErrorBody('boom')).toEqual({ error: 'boom' });
  });

  it('returns undefined for network/JS errors and empty values', () => {
    expect(apiErrorBody(new Error('Network Error'))).toBeUndefined();
    expect(apiErrorBody(undefined)).toBeUndefined();
    expect(apiErrorBody(null)).toBeUndefined();
  });
});

describe('apiErrorMessage', () => {
  it('prefers a human `error` message', () => {
    expect(apiErrorMessage({ error: 'Coupon code already exists', status: 409 }, 'Failed')).toBe('Coupon code already exists');
  });

  it('uses `message` when `error` is a machine code', () => {
    const body = { error: 'business_profile_required', message: 'Create a Business profile before subscribing.', status: 409 };
    expect(apiErrorMessage(body, 'Failed')).toBe('Create a Business profile before subscribing.');
  });

  it('falls back when there is no server message', () => {
    expect(apiErrorMessage({ error: 'business_selection_required' }, 'Failed')).toBe('Failed');
    expect(apiErrorMessage(new Error('Network Error'), 'Failed')).toBe('Failed');
    expect(apiErrorMessage({ error: '   ' }, 'Failed')).toBe('Failed');
  });

  it('surfaces the interceptor timeout message', () => {
    expect(apiErrorMessage({ error: 'Request timed out. Please try again.', isTimeout: true }, 'Failed'))
      .toBe('Request timed out. Please try again.');
  });
});
