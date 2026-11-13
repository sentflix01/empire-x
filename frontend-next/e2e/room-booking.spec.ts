import { test, expect, type Page } from '@playwright/test';

/**
 * Room booking on a published hotel site (decision "Room bookings:
 * availability calendar and 48-hour hold"): a guest picks 2 nights, sends the
 * request, and those nights then show as unavailable. The API is answered in
 * the browser with a tiny availability model (1 room).
 */
const BIZ = '00000000-0000-4000-8000-0000000000e2';
const ROOM = '00000000-0000-4000-8000-0000000000e3';

function addDays(day: string, n: number): string {
  const d = new Date(`${day}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}
const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Addis_Ababa', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());

async function mockHotel(page: Page, booked: Set<string>, sent: Record<string, unknown>[]) {
  const json = (body: unknown, status = 200) => ({ status, contentType: 'application/json', body: JSON.stringify(body) });
  await page.route('**/api/**', (r) => r.fulfill(json([])));
  await page.route('**/api/products*', (r) => r.fulfill(json({ items: [], products: [], next_cursor: null })));
  await page.route('**/api/showrooms/slug/e2e-lake-hotel', (r) => r.fulfill(json({
    id: '00000000-0000-4000-8000-0000000000e4', owner_id: '00000000-0000-4000-8000-0000000000e1', business_id: BIZ,
    title: 'Lake Hotel', description: 'Rooms by the lake', slug: 'e2e-lake-hotel', category: 'event', status: 'published',
    sections: [{ type: 'hero', title: 'Lake Hotel', subtitle: 'Rooms by the lake' }, { type: 'rooms', roomsTitle: 'Our rooms', roomsDesc: 'Breakfast included' }],
    theme_color: null, logo_url: null, view_count: 0,
  })));
  await page.route(`**/api/businesses/${BIZ}/rooms`, (r) => r.fulfill(json({ rooms: [{
    id: ROOM, business_id: BIZ, name: 'Lake view double', description: 'Balcony over the lake', photo_url: null,
    price_per_night: 2500, currency: 'ETB', max_guests: 2, units: 1, active: true,
  }] })));
  await page.route(`**/api/rooms/${ROOM}/availability*`, (r) => {
    const url = new URL(r.request().url());
    const nights = [];
    for (let d = url.searchParams.get('from')!; d < url.searchParams.get('to')!; d = addDays(d, 1)) nights.push({ night: d, free: booked.has(d) ? 0 : 1 });
    return r.fulfill(json({ nights }));
  });
  await page.route('**/api/direct-orders/bookings', (r) => {
    const body = r.request().postDataJSON();
    sent.push(body);
    for (let d = body.check_in; d < body.check_out; d = addDays(d, 1)) booked.add(d);
    return r.fulfill(json({ order: { id: 'o1', status: 'requested' }, access_token: 'e2e-token-1', order_url: '/order/e2e-token-1' }, 201));
  });
}

test('a guest books 2 nights and those nights then show as unavailable', async ({ page }) => {
  const booked = new Set<string>();
  const sent: Record<string, unknown>[] = [];
  await mockHotel(page, booked, sent);
  // The first-visit welcome card opens 600 ms after load; this guest has already seen it.
  await page.addInitScript(() => sessionStorage.setItem('nodbusiness_qr_landing_dismissed', '1'));
  const checkIn = addDays(today, 7);
  const checkOut = addDays(today, 9);

  await page.goto('/showroom/e2e-lake-hotel');
  await expect(page.getByText('Lake view double')).toBeVisible({ timeout: 20_000 });
  await page.getByRole('button', { name: 'Check availability' }).click();
  const sheet = page.getByRole('dialog', { name: /Book a room|Booking request sent/ });
  await sheet.getByLabel('Check-in').fill(checkIn);
  await sheet.getByLabel('Check-out').fill(checkOut);
  await expect(sheet.getByTestId('booking-summary')).toContainText('2 nights');
  await expect(sheet.getByTestId('booking-summary')).toContainText('5,000 ETB');
  await sheet.getByLabel('Full name').fill('Hana Tesfaye');
  await sheet.getByLabel('Phone').fill('+251911223344');
  await sheet.getByLabel('Email').fill('hana@example.test');
  await sheet.getByRole('button', { name: 'Send booking request' }).click();
  await expect(sheet.getByRole('heading', { name: 'Booking request sent' })).toBeVisible();
  expect(sent[0]).toMatchObject({ room_type_id: ROOM, check_in: checkIn, check_out: checkOut, rooms: 1 });
  await expect(sheet.getByRole('link', { name: 'View my booking' })).toHaveAttribute('href', '/order/e2e-token-1');

  // The same nights are now taken.
  await sheet.getByRole('button', { name: 'Close' }).click();
  await page.getByRole('button', { name: 'Check availability' }).click();
  const again = page.getByRole('dialog', { name: /Book a room/ });
  await again.getByLabel('Check-in').fill(checkIn);
  await again.getByLabel('Check-out').fill(checkOut);
  await expect(again.getByTestId('booking-unavailable')).toBeVisible();
  await expect(again.getByRole('button', { name: 'Send booking request' })).toBeDisabled();
});
