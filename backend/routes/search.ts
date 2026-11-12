/**
 * routes/search.ts — Cross-entity full-text search
 * Uses tsvector GIN indexes (migrate32) for queries ≥ 3 chars.
 * Falls back to ILIKE when search_vector column not yet present.
 *
 * Types: users, products, showrooms, businesses, posts (or all). With lat/lon,
 * sort=distance puts the nearest first and radius_km (0–200) limits the area.
 * Businesses and sites use the business's map pin. Every distance that leaves
 * the server is rounded to 0.5 km (lib/locationPrivacy.ts).
 */
import { Router } from 'express';
import type { Request, Response } from 'express';
import logger from '../lib/logger';
import pool from '../db/pool';
import { optionalAuth } from '../middleware/auth';
import { notPrivateBusinessSql, productNotPrivateSql } from '../lib/siteVisibility';
import { roundedDistanceKm } from '../lib/locationPrivacy';

const router = Router();

const SORTS = new Set(['relevance', 'recent', 'distance', 'price_asc', 'price_desc']);
const TYPES = new Set(['all', 'users', 'products', 'showrooms', 'businesses', 'posts']);

function toTsQuery(q: string): string|null {
  const t = q.replace(/[^\w\s]/g,' ').trim().split(/\s+/).filter(Boolean);
  return t.length ? t.join(' & ') : null;
}
function dExpr(lc: string, lonc: string, lat: number|null, lon: number|null): string|null {
  if (lat==null||lon==null) return null;
  return `6371*2*ASIN(SQRT(POWER(SIN(((${lc}-${lat})*PI()/180)/2),2)+COS(${lat}*PI()/180)*COS(${lc}*PI()/180)*POWER(SIN(((${lonc}-${lon})*PI()/180)/2),2)))`;
}
function dSel(lc: string, lonc: string, lat: number|null, lon: number|null): string {
  const e=dExpr(lc,lonc,lat,lon); return e ? `,ROUND(CAST(${e} AS NUMERIC),1) AS distance_km` : ',NULL AS distance_km';
}
function dFlt(lc: string, lonc: string, lat: number|null, lon: number|null, r: number|null): string {
  const e=dExpr(lc,lonc,lat,lon); return (e&&r) ? `AND ${lc} IS NOT NULL AND ${e}<=${r}` : '';
}
function oBy(def: string, lc: string, lonc: string, pc: string|null, sort: string, lat: number|null, lon: number|null): string {
  if (sort==='distance'&&lat!=null) { const e=dExpr(lc,lonc,lat,lon); if(e) return `${lc} IS NULL,${e} ASC`; }
  if (sort==='recent') return 'created_at DESC';
  if (sort==='price_asc'&&pc) return `${pc} ASC NULLS LAST`;
  if (sort==='price_desc'&&pc) return `${pc} DESC NULLS LAST`;
  return def;
}

router.get('/', optionalAuth, async (req: Request, res: Response) => {
  const query = req.query as Record<string,string>;
  const { q, date_from, date_to, price_min, price_max, lat, lon, radius_km, limit='20' } = query;
  const type = TYPES.has(query.type) ? query.type : 'all';
  const sort = SORTS.has(query.sort) ? query.sort : 'relevance';
  if (!q||q.trim().length<2) { res.status(400).json({ error: 'Query must be at least 2 characters' }); return; }
  const raw=q.trim(), ilike=`%${raw}%`, tsQ=toTsQuery(raw), useFTS=raw.length>=3&&tsQ!==null;
  const lim=Math.min(parseInt(limit)||20,50);
  const uL=lat!=null&&!isNaN(parseFloat(lat))?parseFloat(lat):null, uLon=lon!=null&&!isNaN(parseFloat(lon))?parseFloat(lon):null;
  const sL=uL!=null&&uL>=-90&&uL<=90?uL:null, sLon=uLon!=null&&uLon>=-180&&uLon<=180?uLon:null;
  const rParsed=radius_km?parseFloat(radius_km):NaN;
  const radius=Number.isFinite(rParsed)&&rParsed>0&&rParsed<=200?rParsed:null;
  // People who turned off "appear in search", and anyone blocked either way, are left out.
  const viewerId = typeof req.user?.id === 'string' && /^[0-9a-f-]{36}$/i.test(req.user.id) ? req.user.id : null;
  const realUserFilter=(req.realOnly?'AND u.is_seed=FALSE AND u.is_demo=FALSE':'')
    + (viewerId ? ` AND (up.user_id='${viewerId}' OR COALESCE(up.searchable, TRUE)) AND NOT EXISTS (SELECT 1 FROM blocks sb WHERE (sb.blocker_id='${viewerId}' AND sb.blocked_id=up.user_id) OR (sb.blocker_id=up.user_id AND sb.blocked_id='${viewerId}'))` : ' AND COALESCE(up.searchable, TRUE)');
  const realProductFilter=req.realOnly?`AND p.seller_id IN (SELECT id FROM users WHERE is_seed=FALSE AND is_demo=FALSE)
    AND ((p.business_id IS NULL AND p.showroom_id IS NULL) OR EXISTS (
      SELECT 1 FROM business_subscriptions paid_sub
      WHERE paid_sub.business_id=COALESCE(p.business_id,(SELECT s.business_id FROM showrooms s WHERE s.id=p.showroom_id))
        AND paid_sub.tier <> 'freemium'
        AND paid_sub.current_period_end > NOW() - INTERVAL '24 hours'))`:'';
  const realShowroomFilter=req.realOnly?`AND s.owner_id IN (SELECT id FROM users WHERE is_seed=FALSE AND is_demo=FALSE)
    AND EXISTS (SELECT 1 FROM business_subscriptions paid_sub
      WHERE paid_sub.business_id=s.business_id AND paid_sub.tier <> 'freemium'
        AND paid_sub.current_period_end > NOW() - INTERVAL '24 hours')`:'';
  const realPostFilter=req.realOnly?'AND p.author_id IN (SELECT id FROM users WHERE is_seed=FALSE AND is_demo=FALSE)':'';
  // Guests search businesses only: no personal profiles or posts, and no private businesses (decision §7).
  const guest=!req.user;
  const guestProductFilter=guest?`AND ${productNotPrivateSql('p')}`:'';
  const guestShowroomFilter=guest?`AND ${notPrivateBusinessSql('s.business_id')}`:'';
  const R: Record<string,unknown[]> = {};
  try {
    if (guest&&(type==='all'||type==='users')) R.users=[];
    else if (type==='all'||type==='users') {
      const ds=dSel('up.latitude','up.longitude',sL,sLon), df=dFlt('up.latitude','up.longitude',sL,sLon,radius), ob=oBy('up.follower_count DESC','up.latitude','up.longitude',null,sort,sL,sLon);
      let rows;
      if (useFTS) { try { ({rows}=await pool.query(`SELECT up.id,up.user_id,up.display_name,up.avatar_url,up.headline,up.is_verified,up.location,u.is_seed,ts_rank(up.search_vector,to_tsquery('english',$1)) AS rank ${ds} FROM user_profiles up JOIN users u ON u.id=up.user_id WHERE up.search_vector@@to_tsquery('english',$1) ${df} ${realUserFilter} ORDER BY ${sort==='relevance'?'rank DESC,up.follower_count DESC':ob} LIMIT $2`,[tsQ,lim])); } catch { ({rows}=await pool.query(`SELECT up.id,up.user_id,up.display_name,up.avatar_url,up.headline,up.is_verified,up.location,u.is_seed ${ds} FROM user_profiles up JOIN users u ON u.id=up.user_id WHERE (up.display_name ILIKE $1 OR up.headline ILIKE $1 OR up.bio ILIKE $1) ${df} ${realUserFilter} ORDER BY ${ob} LIMIT $2`,[ilike,lim])); } }
      else { ({rows}=await pool.query(`SELECT up.id,up.user_id,up.display_name,up.avatar_url,up.headline,up.is_verified,up.location,u.is_seed ${ds} FROM user_profiles up JOIN users u ON u.id=up.user_id WHERE (up.display_name ILIKE $1 OR up.headline ILIKE $1 OR up.bio ILIKE $1) ${df} ${realUserFilter} ORDER BY ${ob} LIMIT $2`,[ilike,lim])); }
      // One result per person: someone with a personal and business profiles matched once per profile.
      const seen = new Set<string>();
      R.users = (rows as Array<{ user_id: string }>).filter((r) => { const k = String(r.user_id); if (seen.has(k)) return false; seen.add(k); return true; });
    }
    if (type==='all'||type==='products') {
      const ds=dSel('p.latitude','p.longitude',sL,sLon), df=dFlt('p.latitude','p.longitude',sL,sLon,radius), ob=oBy('p.view_count DESC','p.latitude','p.longitude','p.price',sort,sL,sLon);
      const pC: string[]=[], pE: unknown[]=[];
      if (price_min) { pE.push(parseFloat(price_min)); pC.push(`p.price>=$${pE.length+2}`); }
      if (price_max) { pE.push(parseFloat(price_max)); pC.push(`p.price<=$${pE.length+2}`); }
      const pW=pC.length?'AND '+pC.join(' AND '):'';
      let rows;
      if (useFTS) { try { ({rows}=await pool.query(`SELECT p.id,p.seller_id,p.title,p.description,p.price,p.currency,p.images,p.category,p.status,ts_rank(p.search_vector,to_tsquery('english',$1)) AS rank ${ds} FROM products p WHERE p.status='active' AND p.search_vector@@to_tsquery('english',$1) ${pW} ${df} ${realProductFilter} ${guestProductFilter} ORDER BY ${sort==='relevance'?'rank DESC,p.view_count DESC':ob} LIMIT $2`,[tsQ,lim,...pE])); } catch { ({rows}=await pool.query(`SELECT p.id,p.seller_id,p.title,p.description,p.price,p.currency,p.images,p.category,p.status ${ds} FROM products p WHERE p.status='active' AND (p.title ILIKE $1 OR p.description ILIKE $1 OR p.category ILIKE $1) ${pW} ${df} ${realProductFilter} ${guestProductFilter} ORDER BY ${ob} LIMIT $2`,[ilike,lim,...pE])); } }
      else { ({rows}=await pool.query(`SELECT p.id,p.seller_id,p.title,p.description,p.price,p.currency,p.images,p.category,p.status ${ds} FROM products p WHERE p.status='active' AND (p.title ILIKE $1 OR p.description ILIKE $1 OR p.category ILIKE $1) ${pW} ${df} ${realProductFilter} ${guestProductFilter} ORDER BY ${ob} LIMIT $2`,[ilike,lim,...pE])); }
      R.products = rows;
    }
    if (type==='all'||type==='showrooms') {
      // Distance comes from the site's business pin.
      const ds=dSel('sb.latitude','sb.longitude',sL,sLon), df=dFlt('sb.latitude','sb.longitude',sL,sLon,radius);
      const ob=sort==='distance'&&sL!=null ? oBy('s.view_count DESC','sb.latitude','sb.longitude',null,sort,sL,sLon) : sort==='recent'?'s.created_at DESC':'s.view_count DESC';
      const from = 'FROM showrooms s LEFT JOIN businesses sb ON sb.id=s.business_id';
      let rows;
      // The ILIKE pattern is $2 in the full-text query and $1 in the fallbacks.
      const ownerNameMatch = (param: string) => `EXISTS (SELECT 1 FROM user_profiles up WHERE up.user_id=s.owner_id AND up.display_name ILIKE ${param})`;
      if (useFTS) { try { ({rows}=await pool.query(`SELECT s.id,s.owner_id,s.business_id,s.slug,s.title,s.description,s.category,s.cover_image,s.logo_url,s.view_count${ds},ts_rank(to_tsvector('english',coalesce(s.title,'')||' '||coalesce(s.description,'')),to_tsquery('english',$1)) AS rank ${from} WHERE s.status='published' AND (s.expires_at IS NULL OR s.expires_at > NOW()) AND (to_tsvector('english',coalesce(s.title,'')||' '||coalesce(s.description,''))@@to_tsquery('english',$1) OR s.title ILIKE $2 OR s.description ILIKE $2 OR ${ownerNameMatch('$2')}) ${df} ${realShowroomFilter} ${guestShowroomFilter} ORDER BY ${sort==='relevance'?'rank DESC,s.view_count DESC':ob} LIMIT $3`,[tsQ,ilike,lim])); } catch { ({rows}=await pool.query(`SELECT s.id,s.owner_id,s.business_id,s.slug,s.title,s.description,s.category,s.cover_image,s.logo_url,s.view_count${ds} ${from} WHERE s.status='published' AND (s.expires_at IS NULL OR s.expires_at > NOW()) AND (s.title ILIKE $1 OR s.description ILIKE $1 OR ${ownerNameMatch('$1')}) ${df} ${realShowroomFilter} ${guestShowroomFilter} ORDER BY ${ob} LIMIT $2`,[ilike,lim])); } }
      else { ({rows}=await pool.query(`SELECT s.id,s.owner_id,s.business_id,s.slug,s.title,s.description,s.category,s.cover_image,s.logo_url,s.view_count${ds} ${from} WHERE s.status='published' AND (s.expires_at IS NULL OR s.expires_at > NOW()) AND (s.title ILIKE $1 OR s.description ILIKE $1 OR ${ownerNameMatch('$1')}) ${df} ${realShowroomFilter} ${guestShowroomFilter} ORDER BY ${ob} LIMIT $2`,[ilike,lim])); }
      R.showrooms = rows;
    }
    if (type==='all'||type==='businesses') {
      // Businesses on a paid plan, found by name, category or description; distance from their pin.
      const ds=dSel('b.latitude','b.longitude',sL,sLon), df=dFlt('b.latitude','b.longitude',sL,sLon,radius);
      const ob=sort==='distance'&&sL!=null ? oBy('b.created_at DESC','b.latitude','b.longitude',null,sort,sL,sLon) : sort==='recent'?'b.created_at DESC':'(b.business_name ILIKE $1) DESC,b.created_at DESC';
      const realBizFilter=req.realOnly?'AND b.owner_id IN (SELECT id FROM users WHERE is_seed=FALSE AND is_demo=FALSE)':'';
      const guestBizFilter=guest?"AND b.visibility='public'":'';
      const { rows } = await pool.query(
        `SELECT b.id,b.owner_id,b.business_name,b.business_category,b.business_description,b.business_logo_url,b.created_at,b.average_rating,b.review_count${ds}
         FROM businesses b
         WHERE (b.business_name ILIKE $1 OR b.business_category ILIKE $1 OR b.business_description ILIKE $1)
           AND EXISTS (SELECT 1 FROM business_subscriptions paid_sub WHERE paid_sub.business_id=b.id AND paid_sub.tier <> 'freemium' AND paid_sub.current_period_end > NOW() - INTERVAL '24 hours')
           ${df} ${realBizFilter} ${guestBizFilter}
         ORDER BY ${ob} LIMIT $2`,
        [ilike,lim],
      );
      R.businesses = rows;
    }
    if (guest&&(type==='all'||type==='posts')) R.posts=[];
    else if (type==='all'||type==='posts') {
      const dC: string[]=[], dP: unknown[]=[];
      if (date_from) { dP.push(date_from); dC.push(`p.created_at>=$${dP.length+2}`); }
      if (date_to)   { dP.push(date_to);   dC.push(`p.created_at<=$${dP.length+2}`); }
      const dW=dC.length?'AND '+dC.join(' AND '):'';
      let rows;
      if (useFTS) { try { ({rows}=await pool.query(`SELECT p.id,p.author_id,p.author_name,p.author_avatar,p.content,p.post_type,p.like_count,p.comment_count,p.created_at,ts_rank(p.search_vector,to_tsquery('english',$1)) AS rank FROM posts p WHERE p.search_vector@@to_tsquery('english',$1) ${dW} ${realPostFilter} ORDER BY ${sort==='recent'?'p.created_at DESC':'rank DESC,p.like_count DESC'} LIMIT $2`,[tsQ,lim,...dP])); } catch { ({rows}=await pool.query(`SELECT p.id,p.author_id,p.author_name,p.content,p.post_type,p.like_count,p.comment_count,p.created_at FROM posts p WHERE p.content ILIKE $1 ${dW} ${realPostFilter} ORDER BY ${sort==='recent'?'p.created_at DESC':'p.like_count DESC'} LIMIT $2`,[ilike,lim,...dP])); } }
      else { ({rows}=await pool.query(`SELECT p.id,p.author_id,p.author_name,p.content,p.post_type,p.like_count,p.comment_count,p.created_at FROM posts p WHERE p.content ILIKE $1 ${dW} ${realPostFilter} ORDER BY ${sort==='recent'?'p.created_at DESC':'p.like_count DESC'} LIMIT $2`,[ilike,lim,...dP])); }
      R.posts = rows;
    }
    // Distances leave the server rounded to 0.5 km; nobody's exact spot can be worked out.
    for (const k of ['users','products','showrooms','businesses']) {
      if (R[k]) R[k] = (R[k] as Record<string,unknown>[]).map((r) => ({ ...r, distance_km: roundedDistanceKm(r.distance_km) }));
    }
    res.json(R);
  } catch (err) {
    logger.error({ err: (err as Error).message }, 'Search error');
    res.status(500).json({ error: 'Search failed' });
  }
});

module.exports = router;
