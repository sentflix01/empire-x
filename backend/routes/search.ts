/**
 * routes/search.ts — Cross-entity full-text search
 * Uses tsvector GIN indexes (migrate32) for queries ≥ 3 chars.
 * Falls back to ILIKE when search_vector column not yet present.
 */
import { Router } from 'express';
import type { Request, Response } from 'express';
import logger from '../lib/logger';
import pool from '../db/pool';
import { optionalAuth } from '../middleware/auth';

const router = Router();

function hav(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2-lat1)*Math.PI)/180, dLon = ((lon2-lon1)*Math.PI)/180;
  const a = Math.sin(dLat/2)**2 + Math.cos((lat1*Math.PI)/180)*Math.cos((lat2*Math.PI)/180)*Math.sin(dLon/2)**2;
  return R*2*Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}
function attachDistances<T extends Record<string,unknown>>(rows: T[], lat: number, lon: number): T[] {
  return rows.map(r => r.latitude!=null&&r.longitude!=null ? { ...r, distance_km: Math.round(hav(lat,lon,parseFloat(r.latitude as string),parseFloat(r.longitude as string))*10)/10 } : r);
}
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
  const { q, type='all', sort='relevance', date_from, date_to, price_min, price_max, lat, lon, radius_km, limit='20' } = req.query as Record<string,string>;
  if (!q||q.trim().length<2) { res.status(400).json({ error: 'Query must be at least 2 characters' }); return; }
  const raw=q.trim(), ilike=`%${raw}%`, tsQ=toTsQuery(raw), useFTS=raw.length>=3&&tsQ!==null;
  const lim=Math.min(parseInt(limit)||20,50);
  const uL=lat!=null&&!isNaN(parseFloat(lat))?parseFloat(lat):null, uLon=lon!=null&&!isNaN(parseFloat(lon))?parseFloat(lon):null;
  const sL=uL!=null&&uL>=-90&&uL<=90?uL:null, sLon=uLon!=null&&uLon>=-180&&uLon<=180?uLon:null;
  const radius=radius_km?parseFloat(radius_km):null;
  const realUserFilter=req.realOnly?'AND u.is_seed=FALSE AND u.is_demo=FALSE':'';
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
  const R: Record<string,unknown[]> = {};
  try {
    if (type==='all'||type==='users') {
      const ds=dSel('up.latitude','up.longitude',sL,sLon), df=dFlt('up.latitude','up.longitude',sL,sLon,radius), ob=oBy('up.follower_count DESC','up.latitude','up.longitude',null,sort,sL,sLon);
      let rows;
      if (useFTS) { try { ({rows}=await pool.query(`SELECT up.id,up.user_id,up.display_name,up.avatar_url,up.headline,up.is_verified,up.location,u.is_seed,ts_rank(up.search_vector,to_tsquery('english',$1)) AS rank ${ds} FROM user_profiles up JOIN users u ON u.id=up.user_id WHERE up.search_vector@@to_tsquery('english',$1) ${df} ${realUserFilter} ORDER BY ${sort==='relevance'?'rank DESC,up.follower_count DESC':ob} LIMIT $2`,[tsQ,lim])); } catch { ({rows}=await pool.query(`SELECT up.id,up.user_id,up.display_name,up.avatar_url,up.headline,up.is_verified,up.location,u.is_seed ${ds} FROM user_profiles up JOIN users u ON u.id=up.user_id WHERE (up.display_name ILIKE $1 OR up.headline ILIKE $1 OR up.bio ILIKE $1) ${df} ${realUserFilter} ORDER BY ${ob} LIMIT $2`,[ilike,lim])); } }
      else { ({rows}=await pool.query(`SELECT up.id,up.user_id,up.display_name,up.avatar_url,up.headline,up.is_verified,up.location,u.is_seed ${ds} FROM user_profiles up JOIN users u ON u.id=up.user_id WHERE (up.display_name ILIKE $1 OR up.headline ILIKE $1 OR up.bio ILIKE $1) ${df} ${realUserFilter} ORDER BY ${ob} LIMIT $2`,[ilike,lim])); }
      R.users = rows;
    }
    if (type==='all'||type==='products') {
      const ds=dSel('p.latitude','p.longitude',sL,sLon), df=dFlt('p.latitude','p.longitude',sL,sLon,radius), ob=oBy('p.view_count DESC','p.latitude','p.longitude','p.price',sort,sL,sLon);
      const pC: string[]=[], pE: unknown[]=[];
      if (price_min) { pE.push(parseFloat(price_min)); pC.push(`p.price>=$${pE.length+2}`); }
      if (price_max) { pE.push(parseFloat(price_max)); pC.push(`p.price<=$${pE.length+2}`); }
      const pW=pC.length?'AND '+pC.join(' AND '):'';
      let rows;
      if (useFTS) { try { ({rows}=await pool.query(`SELECT p.id,p.seller_id,p.title,p.description,p.price,p.currency,p.images,p.category,p.status,ts_rank(p.search_vector,to_tsquery('english',$1)) AS rank ${ds} FROM products p WHERE p.status='active' AND p.search_vector@@to_tsquery('english',$1) ${pW} ${df} ${realProductFilter} ORDER BY ${sort==='relevance'?'rank DESC,p.view_count DESC':ob} LIMIT $2`,[tsQ,lim,...pE])); } catch { ({rows}=await pool.query(`SELECT p.id,p.seller_id,p.title,p.description,p.price,p.currency,p.images,p.category,p.status ${ds} FROM products p WHERE p.status='active' AND (p.title ILIKE $1 OR p.description ILIKE $1 OR p.category ILIKE $1) ${pW} ${df} ${realProductFilter} ORDER BY ${ob} LIMIT $2`,[ilike,lim,...pE])); } }
      else { ({rows}=await pool.query(`SELECT p.id,p.seller_id,p.title,p.description,p.price,p.currency,p.images,p.category,p.status ${ds} FROM products p WHERE p.status='active' AND (p.title ILIKE $1 OR p.description ILIKE $1 OR p.category ILIKE $1) ${pW} ${df} ${realProductFilter} ORDER BY ${ob} LIMIT $2`,[ilike,lim,...pE])); }
      R.products = rows;
    }
    if (type==='all'||type==='showrooms') {
      const ob=sort==='recent'?'s.created_at DESC':'s.view_count DESC';
      let rows;
      const ownerNameMatch = `EXISTS (SELECT 1 FROM user_profiles up WHERE up.user_id=s.owner_id AND up.display_name ILIKE $2)`;
      if (useFTS) { try { ({rows}=await pool.query(`SELECT s.id,s.owner_id,s.title,s.description,s.category,s.cover_image,s.logo_url,s.view_count,NULL AS distance_km,ts_rank(to_tsvector('english',coalesce(s.title,'')||' '||coalesce(s.description,'')),to_tsquery('english',$1)) AS rank FROM showrooms s WHERE s.status='published' AND (s.expires_at IS NULL OR s.expires_at > NOW()) AND (to_tsvector('english',coalesce(s.title,'')||' '||coalesce(s.description,''))@@to_tsquery('english',$1) OR s.title ILIKE $2 OR s.description ILIKE $2 OR ${ownerNameMatch}) ${realShowroomFilter} ORDER BY ${sort==='relevance'?'rank DESC,s.view_count DESC':ob} LIMIT $3`,[tsQ,ilike,lim])); } catch { ({rows}=await pool.query(`SELECT s.id,s.owner_id,s.title,s.description,s.category,s.cover_image,s.logo_url,s.view_count,NULL AS distance_km FROM showrooms s WHERE s.status='published' AND (s.expires_at IS NULL OR s.expires_at > NOW()) AND (s.title ILIKE $1 OR s.description ILIKE $1 OR ${ownerNameMatch}) ${realShowroomFilter} ORDER BY ${ob} LIMIT $2`,[ilike,lim])); } }
      else { ({rows}=await pool.query(`SELECT s.id,s.owner_id,s.title,s.description,s.category,s.cover_image,s.logo_url,s.view_count,NULL AS distance_km FROM showrooms s WHERE s.status='published' AND (s.expires_at IS NULL OR s.expires_at > NOW()) AND (s.title ILIKE $1 OR s.description ILIKE $1 OR ${ownerNameMatch}) ${realShowroomFilter} ORDER BY ${ob} LIMIT $2`,[ilike,lim])); }
      R.showrooms = rows;
    }
    if (type==='all'||type==='posts') {
      const dC: string[]=[], dP: unknown[]=[];
      if (date_from) { dP.push(date_from); dC.push(`p.created_at>=$${dP.length+2}`); }
      if (date_to)   { dP.push(date_to);   dC.push(`p.created_at<=$${dP.length+2}`); }
      const dW=dC.length?'AND '+dC.join(' AND '):'';
      let rows;
      if (useFTS) { try { ({rows}=await pool.query(`SELECT p.id,p.author_id,p.author_name,p.author_avatar,p.content,p.post_type,p.like_count,p.comment_count,p.created_at,ts_rank(p.search_vector,to_tsquery('english',$1)) AS rank FROM posts p WHERE p.search_vector@@to_tsquery('english',$1) ${dW} ${realPostFilter} ORDER BY ${sort==='recent'?'p.created_at DESC':'rank DESC,p.like_count DESC'} LIMIT $2`,[tsQ,lim,...dP])); } catch { ({rows}=await pool.query(`SELECT p.id,p.author_id,p.author_name,p.content,p.post_type,p.like_count,p.comment_count,p.created_at FROM posts p WHERE p.content ILIKE $1 ${dW} ${realPostFilter} ORDER BY ${sort==='recent'?'p.created_at DESC':'p.like_count DESC'} LIMIT $2`,[ilike,lim,...dP])); } }
      else { ({rows}=await pool.query(`SELECT p.id,p.author_id,p.author_name,p.content,p.post_type,p.like_count,p.comment_count,p.created_at FROM posts p WHERE p.content ILIKE $1 ${dW} ${realPostFilter} ORDER BY ${sort==='recent'?'p.created_at DESC':'p.like_count DESC'} LIMIT $2`,[ilike,lim,...dP])); }
      R.posts = rows;
    }
    if (sL&&sLon) {
      (['users','products'] as const).forEach(k => { if (R[k]) R[k] = attachDistances(R[k] as Record<string,unknown>[], sL, sLon); });
    }
    res.json(R);
  } catch (err) {
    logger.error({ err: (err as Error).message }, 'Search error');
    res.status(500).json({ error: 'Search failed' });
  }
});

module.exports = router;
