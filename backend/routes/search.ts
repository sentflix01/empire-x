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
  const R: Record<string,unknown[]> = {};
  try {
    if (type==='all'||type==='users') {
      const ds=dSel('up.latitude','up.longitude',sL,sLon), df=dFlt('up.latitude','up.longitude',sL,sLon,radius), ob=oBy('up.follower_count DESC','up.latitude','up.longitude',null,sort,sL,sLon);
      let rows;
      if (useFTS) { try { ({rows}=await pool.query(`SELECT up.id,up.user_id,up.display_name,up.avatar_url,up.headline,up.is_verified,up.location,u.is_seed,ts_rank(up.search_vector,to_tsquery('english',$1)) AS rank ${ds} FROM user_profiles up JOIN users u ON u.id=up.user_id WHERE up.search_vector@@to_tsquery('english',$1) ${df} ORDER BY ${sort==='relevance'?'rank DESC,up.follower_count DESC':ob} LIMIT $2`,[tsQ,lim])); } catch { ({rows}=await pool.query(`SELECT up.id,up.user_id,up.display_name,up.avatar_url,up.headline,up.is_verified,up.location,u.is_seed ${ds} FROM user_profiles up JOIN users u ON u.id=up.user_id WHERE (up.display_name ILIKE $1 OR up.headline ILIKE $1 OR up.bio ILIKE $1) ${df} ORDER BY ${ob} LIMIT $2`,[ilike,lim])); } }
      else { ({rows}=await pool.query(`SELECT up.id,up.user_id,up.display_name,up.avatar_url,up.headline,up.is_verified,up.location,u.is_seed ${ds} FROM user_profiles up JOIN users u ON u.id=up.user_id WHERE (up.display_name ILIKE $1 OR up.headline ILIKE $1 OR up.bio ILIKE $1) ${df} ORDER BY ${ob} LIMIT $2`,[ilike,lim])); }
      R.users = rows;
    }
    if (type==='all'||type==='products') {
      const ds=dSel('p.latitude','p.longitude',sL,sLon), df=dFlt('p.latitude','p.longitude',sL,sLon,radius), ob=oBy('p.view_count DESC','p.latitude','p.longitude','p.price',sort,sL,sLon);
      const pC: string[]=[], pE: unknown[]=[];
      if (price_min) { pE.push(parseFloat(price_min)); pC.push(`p.price>=$${pE.length+2}`); }
      if (price_max) { pE.push(parseFloat(price_max)); pC.push(`p.price<=$${pE.length+2}`); }
      const pW=pC.length?'AND '+pC.join(' AND '):'';
      let rows;
      if (useFTS) { try { ({rows}=await pool.query(`SELECT p.id,p.seller_id,p.title,p.description,p.price,p.currency,p.images,p.category,p.status,ts_rank(p.search_vector,to_tsquery('english',$1)) AS rank ${ds} FROM products p WHERE p.status='active' AND p.search_vector@@to_tsquery('english',$1) ${pW} ${df} ORDER BY ${sort==='relevance'?'rank DESC,p.view_count DESC':ob} LIMIT $2`,[tsQ,lim,...pE])); } catch { ({rows}=await pool.query(`SELECT p.id,p.seller_id,p.title,p.description,p.price,p.currency,p.images,p.category,p.status ${ds} FROM products p WHERE p.status='active' AND (p.title ILIKE $1 OR p.description ILIKE $1 OR p.category ILIKE $1) ${pW} ${df} ORDER BY ${ob} LIMIT $2`,[ilike,lim,...pE])); } }
      else { ({rows}=await pool.query(`SELECT p.id,p.seller_id,p.title,p.description,p.price,p.currency,p.images,p.category,p.status ${ds} FROM products p WHERE p.status='active' AND (p.title ILIKE $1 OR p.description ILIKE $1 OR p.category ILIKE $1) ${pW} ${df} ORDER BY ${ob} LIMIT $2`,[ilike,lim,...pE])); }
      R.products = rows;
    }
    if (type==='all'||type==='showrooms') {
      const ob=sort==='recent'?'s.created_at DESC':'s.view_count DESC';
      let rows;
      if (useFTS) { try { ({rows}=await pool.query(`SELECT s.id,s.owner_id,s.title,s.description,s.category,s.cover_image,s.logo_url,s.view_count,NULL AS distance_km,ts_rank(to_tsvector('english',coalesce(s.title,'')||' '||coalesce(s.description,'')),to_tsquery('english',$1)) AS rank FROM showrooms s WHERE s.status='published' AND to_tsvector('english',coalesce(s.title,'')||' '||coalesce(s.description,''))@@to_tsquery('english',$1) ORDER BY ${sort==='relevance'?'rank DESC,s.view_count DESC':ob} LIMIT $2`,[tsQ,lim])); } catch { ({rows}=await pool.query(`SELECT s.id,s.owner_id,s.title,s.description,s.category,s.cover_image,s.logo_url,s.view_count,NULL AS distance_km FROM showrooms s WHERE s.status='published' AND (s.title ILIKE $1 OR s.description ILIKE $1) ORDER BY ${ob} LIMIT $2`,[ilike,lim])); } }
      else { ({rows}=await pool.query(`SELECT s.id,s.owner_id,s.title,s.description,s.category,s.cover_image,s.logo_url,s.view_count,NULL AS distance_km FROM showrooms s WHERE s.status='published' AND (s.title ILIKE $1 OR s.description ILIKE $1) ORDER BY ${ob} LIMIT $2`,[ilike,lim])); }
      R.showrooms = rows;
    }
    if (type==='all'||type==='tasks') {
      const ds=dSel('t.latitude','t.longitude',sL,sLon), df=dFlt('t.latitude','t.longitude',sL,sLon,radius), ob=oBy('t.created_at DESC','t.latitude','t.longitude','t.offered_payment',sort,sL,sLon);
      let rows;
      if (useFTS) { try { ({rows}=await pool.query(`SELECT t.id,t.requester_id,t.title,t.description,t.task_type,t.offered_payment,t.currency,t.status,t.location,t.latitude,t.longitude,ts_rank(t.search_vector,to_tsquery('english',$1)) AS rank ${ds} FROM tasks t WHERE t.status='open' AND t.search_vector@@to_tsquery('english',$1) ${df} ORDER BY ${sort==='relevance'?'rank DESC,t.created_at DESC':ob} LIMIT $2`,[tsQ,lim])); } catch { ({rows}=await pool.query(`SELECT t.id,t.requester_id,t.title,t.description,t.task_type,t.offered_payment,t.currency,t.status,t.location,t.latitude,t.longitude ${ds} FROM tasks t WHERE t.status='open' AND (t.title ILIKE $1 OR t.description ILIKE $1 OR t.location ILIKE $1) ${df} ORDER BY ${ob} LIMIT $2`,[ilike,lim])); } }
      else { ({rows}=await pool.query(`SELECT t.id,t.requester_id,t.title,t.description,t.task_type,t.offered_payment,t.currency,t.status,t.location,t.latitude,t.longitude ${ds} FROM tasks t WHERE t.status='open' AND (t.title ILIKE $1 OR t.description ILIKE $1 OR t.location ILIKE $1) ${df} ORDER BY ${ob} LIMIT $2`,[ilike,lim])); }
      R.tasks = rows;
    }
    if (type==='all'||type==='posts') {
      const dC: string[]=[], dP: unknown[]=[];
      if (date_from) { dP.push(date_from); dC.push(`p.created_at>=$${dP.length+2}`); }
      if (date_to)   { dP.push(date_to);   dC.push(`p.created_at<=$${dP.length+2}`); }
      const dW=dC.length?'AND '+dC.join(' AND '):'';
      let rows;
      if (useFTS) { try { ({rows}=await pool.query(`SELECT p.id,p.author_id,p.author_name,p.author_avatar,p.content,p.post_type,p.like_count,p.comment_count,p.created_at,ts_rank(p.search_vector,to_tsquery('english',$1)) AS rank FROM posts p WHERE p.search_vector@@to_tsquery('english',$1) ${dW} ORDER BY ${sort==='recent'?'p.created_at DESC':'rank DESC,p.like_count DESC'} LIMIT $2`,[tsQ,lim,...dP])); } catch { ({rows}=await pool.query(`SELECT p.id,p.author_id,p.author_name,p.content,p.post_type,p.like_count,p.comment_count,p.created_at FROM posts p WHERE p.content ILIKE $1 ${dW} ORDER BY ${sort==='recent'?'p.created_at DESC':'p.like_count DESC'} LIMIT $2`,[ilike,lim,...dP])); } }
      else { ({rows}=await pool.query(`SELECT p.id,p.author_id,p.author_name,p.content,p.post_type,p.like_count,p.comment_count,p.created_at FROM posts p WHERE p.content ILIKE $1 ${dW} ORDER BY ${sort==='recent'?'p.created_at DESC':'p.like_count DESC'} LIMIT $2`,[ilike,lim,...dP])); }
      R.posts = rows;
    }
    if (type==='all'||type==='jobs') {
      const ds=dSel('j.latitude','j.longitude',sL,sLon), df=dFlt('j.latitude','j.longitude',sL,sLon,radius), ob=oBy('j.created_at DESC','j.latitude','j.longitude',null,sort,sL,sLon);
      const dC: string[]=[], dP: unknown[]=[];
      if (date_from) { dP.push(date_from); dC.push(`j.created_at>=$${dP.length+2}`); }
      if (date_to)   { dP.push(date_to);   dC.push(`j.created_at<=$${dP.length+2}`); }
      const dW=dC.length?'AND '+dC.join(' AND '):'';
      let rows;
      if (useFTS) { try { ({rows}=await pool.query(`SELECT j.id,j.poster_id,j.title,j.description,j.job_type,j.location,j.salary_min,j.salary_max,j.currency,j.category,j.created_at,j.latitude,j.longitude,j.is_remote,ts_rank(j.search_vector,to_tsquery('english',$1)) AS rank ${ds} FROM jobs j WHERE (j.status IS NULL OR j.status='open') AND j.search_vector@@to_tsquery('english',$1) ${dW} ${df} ORDER BY ${sort==='relevance'?'rank DESC,j.created_at DESC':ob} LIMIT $2`,[tsQ,lim,...dP])); } catch { ({rows}=await pool.query(`SELECT j.id,j.poster_id,j.title,j.description,j.job_type,j.location,j.created_at,j.latitude,j.longitude ${ds} FROM jobs j WHERE (j.status IS NULL OR j.status='open') AND (j.title ILIKE $1 OR j.description ILIKE $1) ${dW} ${df} ORDER BY ${ob} LIMIT $2`,[ilike,lim,...dP])); } }
      else { ({rows}=await pool.query(`SELECT j.id,j.poster_id,j.title,j.description,j.job_type,j.location,j.created_at,j.latitude,j.longitude ${ds} FROM jobs j WHERE (j.status IS NULL OR j.status='open') AND (j.title ILIKE $1 OR j.description ILIKE $1) ${dW} ${df} ORDER BY ${ob} LIMIT $2`,[ilike,lim,...dP])); }
      R.jobs = rows;
    }
    if (type==='all'||type==='events') {
      const ds=dSel('e.latitude','e.longitude',sL,sLon), df=dFlt('e.latitude','e.longitude',sL,sLon,radius);
      const dC: string[]=[], dP: unknown[]=[];
      if (date_from) { dP.push(date_from); dC.push(`e.start_at>=$${dP.length+2}`); }
      if (date_to)   { dP.push(date_to);   dC.push(`e.start_at<=$${dP.length+2}`); }
      const dW=dC.length?'AND '+dC.join(' AND '):'';
      let rows;
      if (useFTS) { try { ({rows}=await pool.query(`SELECT e.id,e.organizer_id,e.title,e.description,e.cover_image,e.location,e.start_at,e.ticket_price,e.currency,e.is_online,e.capacity,e.latitude,e.longitude,ts_rank(e.search_vector,to_tsquery('english',$1)) AS rank ${ds} FROM events e WHERE (e.status IS NULL OR e.status='published') AND e.search_vector@@to_tsquery('english',$1) ${dW} ${df} ORDER BY ${sort==='relevance'?'rank DESC,e.start_at ASC':'e.start_at ASC'} LIMIT $2`,[tsQ,lim,...dP])); } catch { ({rows}=await pool.query(`SELECT e.id,e.organizer_id,e.title,e.description,e.location,e.start_at ${ds} FROM events e WHERE (e.status IS NULL OR e.status='published') AND (e.title ILIKE $1 OR e.description ILIKE $1) ${dW} ${df} ORDER BY e.start_at ASC LIMIT $2`,[ilike,lim,...dP])); } }
      else { ({rows}=await pool.query(`SELECT e.id,e.organizer_id,e.title,e.description,e.location,e.start_at ${ds} FROM events e WHERE (e.status IS NULL OR e.status='published') AND (e.title ILIKE $1 OR e.description ILIKE $1) ${dW} ${df} ORDER BY e.start_at ASC LIMIT $2`,[ilike,lim,...dP])); }
      R.events = rows;
    }
    if (sL&&sLon) {
      (['users','products','tasks','jobs','events'] as const).forEach(k => { if (R[k]) R[k] = attachDistances(R[k] as Record<string,unknown>[], sL, sLon); });
    }
    res.json(R);
  } catch (err) {
    logger.error({ err: (err as Error).message }, 'Search error');
    res.status(500).json({ error: 'Search failed' });
  }
});

module.exports = router;
