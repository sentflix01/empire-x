import { coarseCoordinate, roundedDistanceKm, protectCoordinates, isAddressPublic, locationFieldError } from '../lib/locationPrivacy';
import { redactContactFields } from '../lib/contactPrivacy';

describe('location privacy', () => {
  it('rounds coordinates to about 1 km', () => {
    expect(coarseCoordinate(9.0192345)).toBe(9.02);
    expect(coarseCoordinate('38.7525')).toBe(38.75);
    expect(coarseCoordinate(null)).toBeNull();
    expect(coarseCoordinate('x')).toBeNull();
  });

  it('rounds distances up to the next 0.5 km, never below 0.5 km', () => {
    expect(roundedDistanceKm(0.12)).toBe(0.5);
    expect(roundedDistanceKm(1.2)).toBe(1.5);
    expect(roundedDistanceKm(1.5)).toBe(1.5);
    expect(roundedDistanceKm(1.6)).toBe(2);
    expect(roundedDistanceKm(999)).toBeNull();
    expect(roundedDistanceKm(null)).toBeNull();
  });

  it('keeps the exact pin only when allowed', () => {
    const row = { id: 'b', latitude: '9.0192345', longitude: '38.7525111' };
    expect(protectCoordinates(row, true)).toBe(row);
    expect(protectCoordinates(row, false)).toEqual({ id: 'b', latitude: 9.02, longitude: 38.75 });
    expect(protectCoordinates({ id: 'x' }, false)).toEqual({ id: 'x' });
  });

  it('treats the address as private unless the owner chose it', () => {
    expect(isAddressPublic({ public_contact_fields: ['business_address'] })).toBe(true);
    expect(isAddressPublic({ public_contact_fields: ['business_contact_phone'] })).toBe(false);
    expect(isAddressPublic({})).toBe(false);
  });

  it('hides the exact pin with a private address (redactContactFields)', () => {
    const biz = { owner_id: 'o', business_address: 'Bole Rd 12', latitude: 9.0192345, longitude: 38.7525111, public_contact_fields: ['business_contact_phone'] };
    const forOthers = redactContactFields(biz, false);
    expect(forOthers.business_address).toBeNull();
    expect(forOthers.latitude).toBe(9.02);
    expect(forOthers.longitude).toBe(38.75);
    const publicBiz = redactContactFields({ ...biz, public_contact_fields: ['business_address'] }, false);
    expect(publicBiz.latitude).toBe(9.0192345);
    expect(redactContactFields(biz, true).latitude).toBe(9.0192345);
  });

  it('validates an owner pin', () => {
    const ok: Record<string, unknown> = { latitude: '9.01923451', longitude: 38.75 };
    expect(locationFieldError(ok)).toBeNull();
    expect(ok.latitude).toBe(9.0192345);
    expect(locationFieldError({ latitude: 9 })).toMatch(/together/);
    expect(locationFieldError({ latitude: 91, longitude: 0 })).toMatch(/between/);
    expect(locationFieldError({ latitude: null, longitude: null })).toBeNull();
    expect(locationFieldError({ business_name: 'x' })).toBeNull();
  });
});
