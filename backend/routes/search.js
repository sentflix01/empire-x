const router = require('express').Router();
const pool = require('../db/pool');
const { optionalAuth } = require('../middleware/auth');

// Haversine distance in km between two lat/lon points
function haversine(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// Attach distance_km to each row that has latitude/longitude fields
function attachDistances(rows, userLat, userLon) {
  if (!userLat || !userLon) return rows;
  return rows.map(r => {
    if (r.latitude != null && r.longitude != null) {
      const d = haversine(userLat, userLon, parseFloat(r.latitude), parseFloat(r.longitude));
      return { ...r, distance_km: Math.round(d * 10) / 10 };
    }
    return r;
  });
}

// GET /api/search
//   q            keyword (min 2 chars)
//   type         all|users|products|showrooms|tasks|posts|jobs|events  (default: all)
//   sort         relevance|recent|distance|price_asc|price_desc        (default: relevance)
//   date_from    ISO date string — filter posts/events/jobs created after
//   date_to      ISO date string — filter posts/events/jobs created before
//   price_min    number — min price for products
//   price_max    number — max price for products
//   lat          user latitude  (for distance calculation)
//   lon          user longitude (for distance calculation)
//   radius_km    max distance filter (applied to products/tasks/showrooms/users) default: no limit
//   limit        max results per type (default 20, max 50)
router.get('/', optionalAuth, async (req, res) => {
  const {
    q,
    type = 'all',
    sort = 'relevance',
    date_from,
    date_to,
    price_min,
    price_max,
    lat,
    lon,
    radius_km,
    limit = 20,
  } = req.query;

  if (!q || q.trim().length < 2) {
    return res.status(400).json({ error: 'Query must be at least 2 characters' });
  }

  const term = `%${q.trim()}%`;
  const lim = Math.min(parseInt(limit) || 20, 50);
  const userLat = lat ? parseFloat(lat) : null;
  const userLon = lon ? parseFloat(lon) : null;
  const radiusKm = radius_km ? parseFloat(radius_km) : null;

  // Build a Postgres expression for distance filtering/sorting when coords provided
  // Uses the Haversine formula inline
  const distExpr = (latCol, lonCol) =>
    userLat != null && userLon != null
      ? `6371 * 2 * ASIN(SQRT(
           POWER(SIN(((${latCol} - ${userLat}) * PI() / 180) / 2), 2) +
           COS(${userLat} * PI() / 180) * COS(${latCol} * PI() / 180) *
           POWER(SIN(((${lonCol} - ${userLon}) * PI() / 180) / 2), 2)
         ))`
      : null;

  const distFilter = (latCol, lonCol, alias) => {
    const expr = distExpr(latCol, lonCol);
    if (!expr || !radiusKm) return '';
    return `AND ${latCol} IS NOT NULL AND ${lonCol} IS NOT NULL AND ${expr} <= ${radiusKm}`;
  };

  const distSelect = (latCol, lonCol, alias) => {
    const expr = distExpr(latCol, lonCol);
    return expr ? `, ROUND(CAST(${expr} AS NUMERIC), 1) AS distance_km` : ', NULL AS distance_km';
  };

  const orderClause = (defaultOrder, latCol, lonCol, priceCol) => {
    if (sort === 'distance' && userLat != null) {
      const expr = distExpr(latCol, lonCol);
      if (expr) return `${latCol} IS NULL, ${expr} ASC`;
    }
    if (sort === 'recent') return 'created_at DESC';
    if (sort === 'price_asc' && priceCol) return `${priceCol} ASC NULLS LAST`;
    if (sort === 'price_desc' && priceCol) return `${priceCol} DESC NULLS LAST`;
    return defaultOrder;
  };

  try {
    const results = {};

    // ── Users / People ──────────────────────────────────────────────────────
    if (type === 'all' || type === 'users') {
      const dSel = distSelect('up.latitude', 'up.longitude');
      const dFlt = distFilter('up.latitude', 'up.longitude');
      const order = orderClause('up.follower_count DESC', 'up.latitude', 'up.longitude', null);
      const { rows } = await pool.query(
        `SELECT up.id, up.user_id, up.display_name, up.avatar_url, up.headline,
                up.profile_type, up.is_verified, up.location, up.latitude, up.longitude
                ${dSel}
         FROM user_profiles up
         WHERE (up.display_name ILIKE $1 OR up.headline ILIKE $1 OR up.bio ILIKE $1)
           ${dFlt}
         ORDER BY ${order}
         LIMIT $2`,
        [term, lim]
      );
      results.users = rows;
    }

    // ── Products ────────────────────────────────────────────────────────────
    if (type === 'all' || type === 'products') {
      const dSel = distSelect('p.latitude', 'p.longitude');
      const dFlt = distFilter('p.latitude', 'p.longitude');
      const order = orderClause('p.view_count DESC', 'p.latitude', 'p.longitude', 'p.price');

      const extraConds = [];
      const extraParams = [term, lim];
      if (price_min != null) { extraParams.push(parseFloat(price_min)); extraConds.push(`p.price >= $${extraParams.length}`); }
      if (price_max != null) { extraParams.push(parseFloat(price_max)); extraConds.push(`p.price <= $${extraParams.length}`); }

      const { rows } = await pool.query(
        `SELECT p.id, p.seller_id, p.title, p.description, p.price, p.currency,
                p.images, p.category, p.status, p.latitude, p.longitude
                ${dSel}
         FROM products p
         WHERE p.status = 'active'
           AND (p.title ILIKE $1 OR p.description ILIKE $1 OR p.category ILIKE $1 OR p.tags ILIKE $1)
           ${extraConds.length ? 'AND ' + extraConds.join(' AND ') : ''}
           ${dFlt}
         ORDER BY ${order}
         LIMIT $2`,
        extraParams
      );
      results.products = rows;
    }

    // ── Showrooms ────────────────────────────────────────────────────────────
    if (type === 'all' || type === 'showrooms') {
      const dSel = distSelect('s.latitude', 's.longitude');
      const dFlt = distFilter('s.latitude', 's.longitude');
      const order = orderClause('s.view_count DESC', 's.latitude', 's.longitude', null);
      const { rows } = await pool.query(
        `SELECT s.id, s.owner_id, s.title, s.description, s.category,
                s.cover_image, s.logo_url, s.view_count, s.latitude, s.longitude
                ${dSel}
         FROM showrooms s
         WHERE s.status = 'published'
           AND (s.title ILIKE $1 OR s.description ILIKE $1)
           ${dFlt}
         ORDER BY ${order}
         LIMIT $2`,
        [term, lim]
      );
      results.showrooms = rows;
    }

    // ── Tasks ────────────────────────────────────────────────────────────────
    if (type === 'all' || type === 'tasks') {
      const dSel = distSelect('t.latitude', 't.longitude');
      const dFlt = distFilter('t.latitude', 't.longitude');
      const order = orderClause('t.created_at DESC', 't.latitude', 't.longitude', 't.offered_payment');
      const { rows } = await pool.query(
        `SELECT t.id, t.requester_id, t.title, t.description, t.task_type,
                t.offered_payment, t.currency, t.status, t.location,
                t.latitude, t.longitude ${dSel}
         FROM tasks t
         WHERE t.status = 'open'
           AND (t.title ILIKE $1 OR t.description ILIKE $1 OR t.location ILIKE $1)
           ${dFlt}
         ORDER BY ${order}
         LIMIT $2`,
        [term, lim]
      );
      results.tasks = rows;
    }

    // ── Posts ────────────────────────────────────────────────────────────────
    if (type === 'all' || type === 'posts') {
      const dateConds = [];
      const postParams = [term, lim];
      if (date_from) { postParams.push(date_from); dateConds.push(`p.created_at >= $${postParams.length}`); }
      if (date_to)   { postParams.push(date_to);   dateConds.push(`p.created_at <= $${postParams.length}`); }
      const order = sort === 'recent' ? 'p.created_at DESC' : 'p.like_count DESC, p.created_at DESC';
      const { rows } = await pool.query(
        `SELECT p.id, p.author_id, p.author_name, p.author_avatar,
                p.content, p.post_type, p.like_count, p.comment_count, p.created_at
         FROM posts p
         WHERE p.content ILIKE $1
           ${dateConds.length ? 'AND ' + dateConds.join(' AND ') : ''}
         ORDER BY ${order}
         LIMIT $2`,
        postParams
      );
      results.posts = rows;
    }

    // ── Jobs ─────────────────────────────────────────────────────────────────
    if (type === 'jobs') {
      const dSel = distSelect('j.latitude', 'j.longitude');
      const dFlt = distFilter('j.latitude', 'j.longitude');
      const order = orderClause('j.created_at DESC', 'j.latitude', 'j.longitude', null);
      const jobParams = [term, lim];
      const dateConds = [];
      if (date_from) { jobParams.push(date_from); dateConds.push(`j.created_at >= $${jobParams.length}`); }
      if (date_to)   { jobParams.push(date_to);   dateConds.push(`j.created_at <= $${jobParams.length}`); }
      const { rows } = await pool.query(
        `SELECT j.id, j.poster_id, j.title, j.description, j.job_type, j.location,
                j.salary_min, j.salary_max, j.currency, j.category, j.created_at,
                j.latitude, j.longitude, j.is_remote ${dSel}
         FROM jobs j
         WHERE j.status = 'open'
           AND (j.title ILIKE $1 OR j.description ILIKE $1 OR j.location ILIKE $1)
           ${dateConds.length ? 'AND ' + dateConds.join(' AND ') : ''}
           ${dFlt}
         ORDER BY ${order}
         LIMIT $2`,
        jobParams
      );
      results.jobs = rows;
    }

    // ── Events ───────────────────────────────────────────────────────────────
    if (type === 'events') {
      const dSel = distSelect('e.latitude', 'e.longitude');
      const dFlt = distFilter('e.latitude', 'e.longitude');
      const evtParams = [term, lim];
      const dateConds = [];
      if (date_from) { evtParams.push(date_from); dateConds.push(`e.start_at >= $${evtParams.length}`); }
      if (date_to)   { evtParams.push(date_to);   dateConds.push(`e.start_at <= $${evtParams.length}`); }
      const { rows } = await pool.query(
        `SELECT e.id, e.organizer_id, e.title, e.description, e.cover_image,
                e.location, e.start_at, e.ticket_price, e.currency, e.is_online,
                e.capacity, e.latitude, e.longitude ${dSel}
         FROM events e
         WHERE e.status = 'published'
           AND (e.title ILIKE $1 OR e.description ILIKE $1 OR e.location ILIKE $1)
           ${dateConds.length ? 'AND ' + dateConds.join(' AND ') : ''}
           ${dFlt}
         ORDER BY e.start_at ASC
         LIMIT $2`,
        evtParams
      );
      results.events = rows;
    }

    res.json(results);
  } catch (err) {
    console.error('Search error:', err);
    res.status(500).json({ error: 'Search failed' });
  }
});

module.exports = router;
