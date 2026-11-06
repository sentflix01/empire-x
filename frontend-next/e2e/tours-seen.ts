import fs from 'node:fs';
import path from 'node:path';

/**
 * Browser storage that marks every guided tour as already seen, so specs work
 * the same whether tours open automatically for new visitors or not (audit
 * F-032; the default is the owner's decision F-031). Tour ids are read from
 * components/PageGuide.tsx, so new tours are covered without edits here.
 */
export function tourIds(): string[] {
  const source = fs.readFileSync(path.join(__dirname, '..', 'components', 'PageGuide.tsx'), 'utf8');
  const start = source.indexOf('function getTourId(');
  if (start === -1) throw new Error('getTourId not found in components/PageGuide.tsx');
  const body = source.slice(start, source.indexOf('\n}\n', start));
  return [...new Set([...body.matchAll(/return '([A-Z0-9-]+)'/g)].map((m) => m[1]))];
}

export function toursSeenStorageState(frontendUrl: string) {
  const origin = new URL(frontendUrl).origin;
  return {
    cookies: [],
    origins: [{
      origin,
      localStorage: [
        ...tourIds().map((id) => ({ name: `nodbusiness-tour-${id}-done`, value: 'true' })),
        { name: 'nodbusiness-page-guide-seen', value: 'true' },
      ],
    }],
  };
}
