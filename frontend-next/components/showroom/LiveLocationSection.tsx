'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { MapPin, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { getIO } from '@/lib/socket';
import { apiFetch } from '@/api/client';

interface LiveLocationSectionProps {
  businessId: string;
  title?: string;
}

export function LiveLocationSection({ businessId, title = 'Live Location' }: LiveLocationSectionProps) {
  const [location, setLocation] = useState<{
    lat: number;
    lng: number;
    label?: string;
    updated_at: string;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [connected, setConnected] = useState(false);

  const fetchLocation = useCallback(async () => {
    try {
      const res = await apiFetch(`/api/locations/${businessId}`, { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        if (data.available) {
          setLocation({
            lat: data.lat,
            lng: data.lng,
            label: data.label,
            updated_at: data.updated_at,
          });
        }
      }
    } catch (err) {
      console.error('Failed to fetch location:', err);
    } finally {
      setLoading(false);
    }
  }, [businessId]);

  useEffect(() => {
    // Fetch initial location
    fetchLocation();

    // Connect to Socket.IO
    const io = getIO();
    if (!io) {
      setError('Real-time connection not available');
      setLoading(false);
      return;
    }

    // Join the business tracking room
    io.emit('join_business_tracking', businessId);

    const handleLocationUpdate = (data: { business_id: string; lat: number; lng: number; label?: string; updated_at: string }) => {
      if (data.business_id === businessId) {
        setLocation({
          lat: data.lat,
          lng: data.lng,
          label: data.label,
          updated_at: data.updated_at,
        });
        setConnected(true);
      }
    };

    io.on('location_update', handleLocationUpdate);
    io.on('connect', () => setConnected(true));
    io.on('disconnect', () => setConnected(false));
    io.on('connect_error', () => setConnected(false));

    return () => {
      io.off('location_update', handleLocationUpdate);
      io.off('connect');
      io.off('disconnect');
      io.off('connect_error');
      io.emit('leave_business_tracking', businessId);
    };
  }, [businessId, fetchLocation]);

  if (!businessId) {
    return (
      <Card className="border-red-200 bg-red-50">
        <CardContent className="p-6 text-center text-red-600">
          Business ID is required for Live Location section.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>{title}</span>
          <div className="flex items-center gap-2">
            <Badge variant={connected ? 'default' : 'secondary'} className="gap-1">
              {connected ? (
                <>
                  <span className="w-2 h-2 rounded-full bg-green-500 mr-1" />
                  Live
                </>
              ) : (
                <>
                  <span className="w-2 h-2 rounded-full bg-gray-400 mr-1" />
                  Offline
                </>
              )}
            </Badge>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
            <p className="text-gray-500 mt-2">Loading location...</p>
          </div>
        ) : error ? (
          <div className="text-center py-8 text-red-600">
            <p className="font-medium">Failed to load location</p>
            <p className="text-sm text-gray-500 mt-1">{error}</p>
            <Button variant="outline" size="sm" onClick={fetchLocation} className="mt-2">
              Try Again
            </Button>
          </div>
        ) : location ? (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-500 mb-1">Latitude</p>
                <p className="font-mono text-lg font-medium">{location.lat.toFixed(6)}</p>
              </div>
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-500 mb-1">Longitude</p>
                <p className="font-mono text-lg font-medium">{location.lng.toFixed(6)}</p>
              </div>
            </div>
            {location.label && (
              <div className="p-4 bg-blue-50 rounded-lg">
                <p className="text-sm text-blue-700 mb-1">Location Label</p>
                <p className="font-medium text-blue-900">{location.label}</p>
              </div>
            )}
            <div className="p-4 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-500 mb-1">Last Updated</p>
              <p className="font-medium text-gray-900">
                {new Date(location.updated_at).toLocaleString()}
              </p>
            </div>

            {/* Map Embed */}
            <div className="rounded-lg overflow-hidden border border-gray-200">
              <iframe
                title="Live Location Map"
                width="100%"
                height={300}
                style={{ border: 0 }}
                loading="lazy"
                allowFullScreen
                src={`https://maps.google.com/maps?q=${location.lat},${location.lng}&z=15&output=embed`}
              />
            </div>

            {/* Coordinates Display */}
            <div className="grid grid-cols-2 gap-2 p-4 bg-gray-50 rounded-lg">
              <div className="text-center">
                <p className="text-xs text-gray-500 uppercase tracking-wide">Google Maps</p>
                <a
                  href={`https://maps.google.com/?q=${location.lat},${location.lng}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-blue-600 hover:underline font-medium"
                >
                  Open in Google Maps
                </a>
              </div>
              <div className="text-center">
                <p className="text-xs text-gray-500 uppercase tracking-wide">Apple Maps</p>
                <a
                  href={`https://maps.apple.com/?q=${location.lat},${location.lng}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-blue-600 hover:underline font-medium"
                >
                  Open in Apple Maps
                </a>
              </div>
              <div className="text-center">
                <p className="text-xs text-gray-500 uppercase tracking-wide">Waze</p>
                <a
                  href={`https://waze.com/ul?ll=${location.lat},${location.lng}&navigate=yes`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-blue-600 hover:underline font-medium"
                >
                  Navigate with Waze
                </a>
              </div>
              <div className="text-center">
                <p className="text-xs text-gray-500 uppercase tracking-wide">Coordinates</p>
                <button
                  onClick={() => navigator.clipboard.writeText(`${location.lat.toFixed(6)}, ${location.lng.toFixed(6)}`)}
                  className="text-sm text-blue-600 hover:underline font-medium"
                >
                  Copy Coordinates
                </button>
              </div>
            </div>

            {/* Update Location Button (for business owners) */}
            <div className="pt-4 border-t">
              <Button
                variant="outline"
                onClick={() => {
                  if (navigator.geolocation) {
                    navigator.geolocation.getCurrentPosition(
                      (pos) => {
                        // This would call the API to update location
                        apiFetch(`/api/locations/update`, {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          credentials: 'include',
                          body: JSON.stringify({
                            lat: pos.coords.latitude,
                            lng: pos.coords.longitude,
                            label: 'Updated via browser',
                            accuracy_m: pos.coords.accuracy,
                          }),
                        }).then(() => fetchLocation());
                      },
                      (err) => alert('Unable to get location: ' + err.message)
                    );
                  } else {
                    alert('Geolocation is not supported by your browser');
                  }
                }}
              >
                <MapPin className="w-4 h-4 mr-2" />
                Update My Location
              </Button>
            </div>
          </div>
        ) : (
          <div className="text-center py-12 text-gray-500">
            <p className="mb-2">No live location data available</p>
            <p className="text-sm mb-4">The business owner can update their location from the dashboard.</p>
            <Button variant="outline" onClick={() => {
              if (navigator.geolocation) {
                navigator.geolocation.getCurrentPosition(
                  (pos) => {
                    apiFetch(`/api/locations/update`, {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      credentials: 'include',
                      body: JSON.stringify({
                        lat: pos.coords.latitude,
                        lng: pos.coords.longitude,
                        label: 'Updated via browser',
                        accuracy_m: pos.coords.accuracy,
                      }),
                    }).then(() => fetchLocation());
                  },
                  (err) => alert('Unable to get location: ' + err.message)
                );
              } else {
                alert('Geolocation is not supported by your browser');
              }
            }}>
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              Use My Current Location
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default LiveLocationSection;
