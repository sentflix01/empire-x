/**
 * leaflet ships no TypeScript types and @types/leaflet is not installed. The
 * map code (components/map/*, views/NearbyMap.tsx) loads it with
 * import('leaflet') and uses it through react-leaflet, so a plain module
 * declaration is enough and keeps the strict check clean (audit F-052).
 */
declare module 'leaflet' {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const L: any;
  export default L;
}
