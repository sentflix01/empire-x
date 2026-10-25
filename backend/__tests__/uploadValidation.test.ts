/**
 * Photo uploads: the real content decides, by format signature. Every photo
 * stored on disk and every HEIC photo used to be refused ("File content does
 * not match"), and photos with no file extension were refused outright.
 */
import { sniffFormat, validateFileBytes, fileFilter, SIGNATURE_BYTES } from '../middleware/upload';

const jpeg = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 0x10, 0x4a, 0x46, 0x49, 0x46]);
const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0x0d]);
const gif = Buffer.from('GIF89a\x01\x00', 'latin1');
const webp = Buffer.concat([Buffer.from('RIFF'), Buffer.from([0x24, 0, 0, 0]), Buffer.from('WEBPVP8 ')]);
const heic = Buffer.concat([Buffer.from([0, 0, 0, 0x18]), Buffer.from('ftypheic'), Buffer.from([0, 0, 0, 0]), Buffer.from('mif1heic')]);
const avif = Buffer.concat([Buffer.from([0, 0, 0, 0x1c]), Buffer.from('ftypavif'), Buffer.from([0, 0, 0, 0]), Buffer.from('avifmif1')]);
const pdf = Buffer.from('%PDF-1.7\n');
const html = Buffer.from('<html><script>alert(1)</script></html>');

describe('sniffFormat', () => {
  it.each([[jpeg, 'jpeg'], [png, 'png'], [gif, 'gif'], [webp, 'webp'], [heic, 'heif'], [avif, 'heif'], [pdf, 'pdf'], [html, null]])('%#', (bytes, family) => {
    expect(sniffFormat(bytes as Buffer)).toBe(family);
  });
  it('needs only the first bytes', () => expect(SIGNATURE_BYTES).toBeLessThanOrEqual(64));
});

describe('validateFileBytes', () => {
  it('accepts real photos, including HEIC from phones', async () => {
    for (const [bytes, mime] of [[jpeg, 'image/jpeg'], [png, 'image/png'], [webp, 'image/webp'], [heic, 'image/heic'], [avif, 'image/avif']] as const) {
      expect(await validateFileBytes(bytes, mime)).toBeNull();
    }
  });
  it('accepts a real image labelled as another image type (phones do this)', async () => {
    expect(await validateFileBytes(jpeg, 'image/png')).toBeNull();
  });
  it('refuses something that isn’t an image or a PDF', async () => {
    expect(await validateFileBytes(html, 'image/png')).toMatch(/isn’t a photo/);
    expect(await validateFileBytes(png, 'application/pdf')).toMatch(/PDF/);
  });
});

describe('fileFilter', () => {
  const run = (originalname: string, mimetype: string) => new Promise<{ ok: boolean; code?: string }>((resolve) => {
    fileFilter({} as never, { originalname, mimetype } as never, (err: unknown, ok?: boolean) =>
      resolve(err ? { ok: false, code: (err as { code?: string }).code } : { ok: Boolean(ok) }));
  });
  it('accepts photos with no file extension', async () => {
    expect(await run('IMG_20261025_234012', 'image/jpeg')).toEqual({ ok: true });
    expect(await run('image', 'image/heic')).toEqual({ ok: true });
  });
  it('refuses types that aren’t allowed, or an extension that contradicts the type', async () => {
    expect((await run('page.html', 'text/html')).code).toBe('UNSUPPORTED_FILE_TYPE');
    expect((await run('photo.png', 'application/pdf')).code).toBe('UNSUPPORTED_FILE_TYPE');
    expect(await run('photo.JPG', 'image/jpeg')).toEqual({ ok: true });
  });
});
