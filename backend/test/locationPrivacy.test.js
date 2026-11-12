'use strict';

const { roundedDistanceKm, DISTANCE_BUCKET_KM } = require('../lib/locationPrivacy');

describe('roundedDistanceKm', () => {
  it('uses 0.5 km buckets', () => expect(DISTANCE_BUCKET_KM).toBe(0.5));

  it.each([
    [0, 0.5],
    [0.01, 0.5],
    [0.49, 0.5],
    [0.5, 0.5],
    [0.51, 1],
    [2.22, 2.5],
    [3.2, 3.5],
    [10, 10],
  ])('rounds %p km up to %p km', (km, expected) => {
    expect(roundedDistanceKm(km)).toBe(expected);
  });

  it.each([[NaN], [Infinity], [-1], [null], [undefined]])('returns null for %p', (km) => {
    expect(roundedDistanceKm(km)).toBeNull();
  });
});
