'use client'
import Link from 'next/link';
import React, { useState, useEffect } from "react";
import { entities } from "@/api/entities";
import { auth } from "@/api/auth";
import client from "@/api/client";

import { CalendarDays, MapPin, Ticket, Plus, Globe, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import moment from "moment";
import { useTranslation } from 'react-i18next';

export default function Events() {
  const { t } = useTranslation();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [bookingId, setBookingId] = useState(null);

  useEffect(() => {
    auth.me().then(setUser).catch(() => {});
    entities.Event.filter({ status: "published" }, "-start_at", 50)
      .then(setEvents).finally(() => setLoading(false));
  }, []);

  const handleBook = async (event) => {
    if (!user) return;
    setBookingId(event.id);
    try {
      await client.post(`/api/events/${event.id}/book`);
      toast.success("Booked successfully! 🎉");
    } catch (e) {
      toast.error(e?.response?.data?.error || "Booking failed");
    }
    setBookingId(null);
  };

  return (
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="font-display text-2xl font-bold">Events</h1>
            <p className="text-sm text-muted-foreground">Discover events near you</p>
          </div>
          <Link href="/events/create">
            <Button size="sm" className="rounded-full bg-gradient-to-r from-amber-500 to-amber-600">
              <Plus className="w-4 h-4 mr-1" /> Create Event
            </Button>
          </Link>
        </div>

        {loading ? (
          <div className="flex justify-center py-12"><div className="w-8 h-8 border-3 border-amber-500/30 border-t-amber-500 rounded-full animate-spin" /></div>
        ) : events.length === 0 ? (
          <div className="text-center py-16">
            <CalendarDays className="w-12 h-12 text-muted-foreground/20 mx-auto mb-3" />
            <p className="text-muted-foreground">No events yet. Create the first one!</p>
          </div>
        ) : (
          <div className="space-y-3">
            {events.map(event => (
              <div key={event.id} className="bg-card rounded-2xl border border-border/50 overflow-hidden">
                {event.cover_image && (
                  <img src={event.cover_image} alt={event.title} className="w-full h-40 object-cover" />
                )}
                <div className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="font-semibold text-base">{event.title}</h3>
                    {event.ticket_price > 0 ? (
                      <Badge className="bg-amber-100 text-amber-700 border-0 shrink-0 ml-2">
                        {event.ticket_price.toLocaleString()} {event.currency}
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-green-600 border-green-200 shrink-0 ml-2">Free</Badge>
                    )}
                  </div>
                  {event.description && <p className="text-sm text-muted-foreground mb-3 line-clamp-2">{event.description}</p>}
                  <div className="flex flex-wrap gap-3 text-xs text-muted-foreground mb-3">
                    <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{moment(event.start_at).format("MMM D, YYYY • h:mm A")}</span>
                    {event.is_online ? (
                      <span className="flex items-center gap-1"><Globe className="w-3 h-3" />Online</span>
                    ) : event.location && (
                      <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{event.location}</span>
                    )}
                    {event.capacity && <span className="flex items-center gap-1"><Ticket className="w-3 h-3" />{event.capacity} seats</span>}
                  </div>
                  <Button
                    size="sm"
                    className="rounded-full bg-gradient-to-r from-amber-500 to-amber-600"
                    disabled={bookingId === event.id}
                    onClick={() => handleBook(event)}
                  >
                    <Ticket className="w-3 h-3 mr-1" />
                    {bookingId === event.id ? t('common.loading') : event.ticket_price > 0 ? t('events.attend') : t('events.attend')}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
  );
}




