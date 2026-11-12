/**
 * Rooms with an availability calendar: the website section lists rooms, the
 * booking sheet checks the chosen nights, shows the total and sends the
 * request, and the owner's calendar closes a night.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';

const http = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn(), put: vi.fn() }));
vi.mock('@/api/client', () => ({ default: http, apiFetch: vi.fn() }));
vi.mock('@/lib/AuthContext', () => ({ useAuth: () => ({ user: null }) }));
vi.mock('next/link', () => ({ default: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => <a href={href} {...rest}>{children}</a> }));
vi.mock('sonner', () => ({ toast: { error: vi.fn(), success: vi.fn() } }));

import RoomsSection from '@/components/rooms/RoomsSection';
import BookingSheet from '@/components/rooms/BookingSheet';
import { RoomCalendar } from '@/views/BusinessRooms';
import { addDays, formatDay, todayDay } from '@/lib/roomDates';

const room = { id: 'r1', business_id: 'b1', name: 'Deluxe double', description: 'Lake view', photo_url: null, price_per_night: 1500, currency: 'ETB', max_guests: 2, units: 2, active: true };
const day = (n: number) => addDays(todayDay(), n);

beforeEach(() => { http.get.mockReset(); http.post.mockReset(); http.put.mockReset(); });

describe('Rooms section', () => {
  it('lists active rooms with the price per night and opens the booking sheet', async () => {
    http.get.mockImplementation(async (url: string) => url.includes('/availability')
      ? { data: { nights: [{ night: day(1), free: 2 }] } }
      : { data: { rooms: [room, { ...room, id: 'r2', name: 'Old room', active: false }] } });
    render(<RoomsSection sectionIndex={0} title="Our rooms" businessId="b1" themeColor="#2563EB" />);
    expect(await screen.findByText('Deluxe double')).toBeTruthy();
    expect(screen.getAllByTestId('room-card')).toHaveLength(1);
    expect(screen.getByText('1,500 ETB')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Check availability' }));
    expect(await screen.findByRole('dialog', { name: /Book a room/ })).toBeTruthy();
  });

  it('shows the owner a Manage rooms link instead of booking', async () => {
    http.get.mockResolvedValue({ data: { rooms: [] } });
    render(<RoomsSection sectionIndex={0} title="Our rooms" businessId="b1" themeColor="#2563EB" isOwner />);
    expect(await screen.findByText(/No rooms yet/)).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Manage rooms' }).getAttribute('href')).toBe('/business/rooms?business=b1');
  });
});

describe('Booking sheet', () => {
  const fill = () => {
    fireEvent.change(screen.getByLabelText('Check-in'), { target: { value: day(3) } });
    fireEvent.change(screen.getByLabelText('Check-out'), { target: { value: day(5) } });
    fireEvent.change(screen.getByLabelText('Full name'), { target: { value: 'Hana T' } });
    fireEvent.change(screen.getByLabelText('Phone'), { target: { value: '+251911223344' } });
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'hana@example.test' } });
  };

  it('shows nights × price and sends the request', async () => {
    http.get.mockResolvedValue({ data: { nights: [{ night: day(3), free: 2 }, { night: day(4), free: 1 }] } });
    http.post.mockResolvedValue({ data: { order: { id: 'o1' }, access_token: 'tok123', order_url: '/order/tok123' } });
    render(<BookingSheet room={room} onClose={() => {}} />);
    fill();
    await waitFor(() => expect(screen.getByTestId('booking-summary').textContent).toContain('2 nights · 1 room · 3,000 ETB'));
    fireEvent.click(screen.getByRole('button', { name: 'Send booking request' }));
    await screen.findByText('Booking request sent');
    expect(http.post).toHaveBeenCalledWith('/api/direct-orders/bookings', expect.objectContaining({
      room_type_id: 'r1', check_in: day(3), check_out: day(5), rooms: 1, guests: 2, buyer_name: 'Hana T',
    }));
    expect(screen.getByRole('link', { name: 'View my booking' }).getAttribute('href')).toBe('/order/tok123');
  });

  it('says which nights are full and blocks sending', async () => {
    http.get.mockResolvedValue({ data: { nights: [{ night: day(3), free: 1 }, { night: day(4), free: 1 }] } });
    render(<BookingSheet room={room} onClose={() => {}} />);
    fill();
    fireEvent.change(screen.getByLabelText('Rooms'), { target: { value: '2' } });
    expect(await screen.findByTestId('booking-unavailable')).toBeTruthy();
    expect((screen.getByRole('button', { name: 'Send booking request' }) as HTMLButtonElement).disabled).toBe(true);
  });

  it('shows the nights another guest just took', async () => {
    http.get.mockResolvedValue({ data: { nights: [{ night: day(3), free: 1 }, { night: day(4), free: 1 }] } });
    http.post.mockRejectedValue({ status: 409, code: 'ROOMS_UNAVAILABLE', nights: [day(4)], error: 'Not available' });
    render(<BookingSheet room={room} onClose={() => {}} />);
    fill();
    await screen.findByTestId('booking-summary');
    fireEvent.click(screen.getByRole('button', { name: 'Send booking request' }));
    expect(await screen.findByTestId('booking-unavailable')).toBeTruthy();
  });
});

describe('Owner calendar', () => {
  it('closes a free night when tapped', async () => {
    http.get.mockImplementation(async (_url: string, opts: { params: { from: string; to: string } }) => {
      const nights = []; for (let d = opts.params.from; d < opts.params.to; d = addDays(d, 1)) nights.push({ night: d, booked: 0, blocked: 0, free: 2 });
      return { data: { nights } };
    });
    http.put.mockResolvedValue({ data: { night: day(1), booked: 0, blocked: 2, free: 0 } });
    render(<RoomCalendar room={room} />);
    const target = day(1);
    // Tomorrow may fall in next month.
    if (target.slice(0, 7) !== todayDay().slice(0, 7)) fireEvent.click(screen.getByRole('button', { name: 'Next month' }));
    const cell = await screen.findByRole('button', { name: `${formatDay(target)}: 2 of 2 free` });
    expect(cell.getAttribute('aria-pressed')).toBe('false');
    fireEvent.click(cell);
    await waitFor(() => expect(http.put).toHaveBeenCalledWith(`/api/rooms/r1/blocks/${target}`, { units: 2 }));
    expect((await screen.findByRole('button', { name: `${formatDay(target)}: 0 of 2 free, 2 closed` })).getAttribute('aria-pressed')).toBe('true');
  });
});
