/**
 * rooms.ts — room types, availability and bookings
 * (/api/businesses/:id/rooms, /api/rooms/:id, /api/direct-orders/bookings).
 * Decision "Room bookings: availability calendar and 48-hour hold".
 */
import client from './client';

export interface RoomType {
  id: string;
  business_id: string;
  name: string;
  description: string | null;
  photo_url: string | null;
  price_per_night: number;
  currency: string;
  max_guests: number;
  units: number;
  active: boolean;
}

/** Visitors get `free` only; owners also get booked and blocked counts. */
export interface NightAvailability { night: string; free: number; booked?: number; blocked?: number }

export interface RoomBooking {
  id: string; room_type_id: string; check_in: string; check_out: string; nights: number; guests: number; rooms: number;
  status: string; buyer_name: string | null; total_price: number; currency: string;
}

export type RoomInput = Partial<Pick<RoomType, 'name' | 'description' | 'photo_url' | 'price_per_night' | 'max_guests' | 'units' | 'active'>>;

export async function listRooms(businessId: string): Promise<RoomType[]> {
  const { data } = await client.get<{ rooms: RoomType[] }>(`/api/businesses/${businessId}/rooms`);
  return data?.rooms ?? [];
}

export async function createRoom(businessId: string, input: RoomInput): Promise<RoomType> {
  const { data } = await client.post<{ room: RoomType }>(`/api/businesses/${businessId}/rooms`, input);
  return data.room;
}

export async function updateRoom(businessId: string, roomId: string, input: RoomInput): Promise<RoomType> {
  const { data } = await client.put<{ room: RoomType }>(`/api/businesses/${businessId}/rooms/${roomId}`, input);
  return data.room;
}

export async function removeRoom(businessId: string, roomId: string): Promise<{ deleted: boolean; hidden: boolean }> {
  const { data } = await client.delete(`/api/businesses/${businessId}/rooms/${roomId}`);
  return data;
}

export async function fetchAvailability(roomId: string, from: string, to: string): Promise<NightAvailability[]> {
  const { data } = await client.get<{ nights: NightAvailability[] }>(`/api/rooms/${roomId}/availability`, { params: { from, to } });
  return data?.nights ?? [];
}

export async function setBlockedRooms(roomId: string, night: string, units: number): Promise<NightAvailability> {
  const { data } = await client.put<NightAvailability>(`/api/rooms/${roomId}/blocks/${night}`, { units });
  return data;
}

export async function fetchRoomBookings(businessId: string, from: string, to: string): Promise<RoomBooking[]> {
  const { data } = await client.get<{ bookings: RoomBooking[] }>(`/api/businesses/${businessId}/rooms/bookings`, { params: { from, to } });
  return data?.bookings ?? [];
}

export interface BookingRequest {
  room_type_id: string; check_in: string; check_out: string; guests: number; rooms: number;
  buyer_name: string; buyer_phone: string; buyer_email: string; notes?: string;
}

export async function requestBooking(body: BookingRequest): Promise<{ order: Record<string, unknown>; access_token: string; order_url: string }> {
  const { data } = await client.post('/api/direct-orders/bookings', body);
  return data;
}
