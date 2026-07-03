const router = require('express').Router();
const pool = require('../db/pool');
const { requireAuth, optionalAuth } = require('../middleware/auth');

/**
 * Geocode an address string to lat/long using Nominatim (free OpenStreetMap)
 * Returns { lat, lon } or null
 */
async function geocode(address) {
  if (!address) return null;
  try {
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(address)}&format=json&limit=1&countrycodes=et`;
    const res = await fetch(url, {
      headers: { 'User-Agent': 'EmpireXApp/1.0 (contact@empirex.app)' },
    });
    const data = await res.json();
    if (data.length) return { lat: parseFloat(data[0].lat), lon: parseFloat(data[0].lon) };
    return null;
  } catch {
    return null;
  }
}

// Geocode an address and return coordinates
router.get('/geocode', async (req, res) => {
  const { address } = req.query;
  if (!address) return res.status(400).json({ error: 'address is required' });
  const coords = await geocode(address);
  if (!coords) return res.status(404).json({ error: 'Address not found' });
  res.json(coords);
});

// Get nearby tasks
router.get('/nearby/tasks', optionalAuth, async (req, res) => {
  const { lat, lon, radius_km = 20 } = req.query;
  if (!lat || !lon) return res.status(400).json({ error: 'lat and lon are required' });
  try {
    const { rows } = await pool.query(
      `SELECT * FROM (
         SELECT *, (6371 * acos(LEAST(1,
           cos(radians($1)) * cos(radians(latitude)) *
           cos(radians(longitude) - radians($2)) +
           sin(radians($1)) * sin(radians(latitude))
         ))) AS distance_km
         FROM tasks
         WHERE status = 'open' AND latitude IS NOT NULL AND longitude IS NOT NULL
       ) sub
       WHERE distance_km <= $3
       ORDER BY distance_km ASC LIMIT 50`,
      [parseFloat(lat), parseFloat(lon), parseFloat(radius_km)]
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch nearby tasks' });
  }
});

// Get nearby products
router.get('/nearby/products', optionalAuth, async (req, res) => {
  const { lat, lon, radius_km = 30 } = req.query;
  if (!lat || !lon) return res.status(400).json({ error: 'lat and lon are required' });
  try {
    const { rows } = await pool.query(
      `SELECT * FROM (
         SELECT *, (6371 * acos(LEAST(1,
           cos(radians($1)) * cos(radians(latitude)) *
           cos(radians(longitude) - radians($2)) +
           sin(radians($1)) * sin(radians(latitude))
         ))) AS distance_km
         FROM products
         WHERE status = 'active' AND latitude IS NOT NULL AND longitude IS NOT NULL
       ) sub
       WHERE distance_km <= $3
       ORDER BY distance_km ASC LIMIT 50`,
      [parseFloat(lat), parseFloat(lon), parseFloat(radius_km)]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch nearby products' });
  }
});

// Get nearby businesses
router.get('/nearby/businesses', optionalAuth, async (req, res) => {
  const { lat, lon, radius_km = 25, category } = req.query;
  if (!lat || !lon) return res.status(400).json({ error: 'lat and lon are required' });
  try {
    const params = [parseFloat(lat), parseFloat(lon), parseFloat(radius_km)];
    let catFilter = '';
    if (category) {
      params.push(category);
      catFilter = `AND b.business_category = $${params.length}`;
    }
    const { rows } = await pool.query(
      `SELECT * FROM (
         SELECT b.*,
           up.display_name, up.avatar_url, up.user_id,
           (
             6371 * acos(
               LEAST(1, cos(radians($1)) * cos(radians(b.latitude)) *
               cos(radians(b.longitude) - radians($2)) +
               sin(radians($1)) * sin(radians(b.latitude)))
             )
           ) AS distance_km
         FROM businesses b
         JOIN user_profiles up ON up.user_id = b.owner_id
         WHERE b.latitude IS NOT NULL AND b.longitude IS NOT NULL ${catFilter}
       ) sub
       WHERE distance_km <= $3
       ORDER BY distance_km ASC
       LIMIT 50`,
      params
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch nearby businesses' });
  }
});

// Update user's location
router.put('/my-location', requireAuth, async (req, res) => {
  const { latitude, longitude, address } = req.body;
  try {
    let lat = latitude, lon = longitude;
    if (!lat && address) {
      const coords = await geocode(address);
      if (coords) { lat = coords.lat; lon = coords.lon; }
    }
    await pool.query(
      'UPDATE user_profiles SET latitude = $1, longitude = $2 WHERE user_id = $3',
      [lat, lon, req.user.id]
    );
    res.json({ latitude: lat, longitude: lon });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update location' });
  }
});

module.exports = router;
module.exports.geocode = geocode;

