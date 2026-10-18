import { canonicalGtin, gtinCheckDigitOk, parseProductCode } from '../lib/barcode';
import { gtinVariants, suggestionFromOpenFacts } from '../lib/productLookup';

describe('product codes from a scan', () => {
  it('accepts real EAN-13, UPC-A and EAN-8 barcodes and rejects a wrong check digit', () => {
    expect(gtinCheckDigitOk('5449000000996')).toBe(true);   // EAN-13
    expect(gtinCheckDigitOk('5449000000997')).toBe(false);
    expect(gtinCheckDigitOk('036000291452')).toBe(true);    // UPC-A
    expect(gtinCheckDigitOk('96385074')).toBe(true);        // EAN-8
    expect(gtinCheckDigitOk('12345')).toBe(false);
  });

  it('stores one key per product (UPC-A gains a leading zero)', () => {
    expect(canonicalGtin('036000291452')).toBe('0036000291452');
    expect(parseProductCode('5449 0000 0099 6')).toEqual({ kind: 'gtin', gtin: '5449000000996' });
    expect(gtinVariants('0036000291452')).toEqual(expect.arrayContaining(['0036000291452', '036000291452', '00036000291452']));
  });

  it('reads a GS1 Digital Link QR code', () => {
    expect(parseProductCode('https://id.gs1.org/01/09506000134352/10/ABC?x=1')).toEqual({ kind: 'gtin', gtin: '9506000134352' });
  });

  it('treats other QR text as "not a product code"', () => {
    expect(parseProductCode('https://example.com/menu')).toEqual({ kind: 'text', text: 'https://example.com/menu' });
    expect(parseProductCode('')).toBeNull();
  });

  it('turns an Open Food Facts answer into a suggestion, and ignores "not found"', () => {
    expect(suggestionFromOpenFacts({ status: 1, product: { product_name: 'Highland Water', brands: 'Highland, Other', categories: 'Beverages, Waters', quantity: '500 ml', image_front_url: 'https://images.openfoodfacts.org/x.jpg' } }))
      .toEqual({ title: 'Highland Water', description: 'Highland Water, 500 ml', category: 'Waters', brand: 'Highland', image_url: 'https://images.openfoodfacts.org/x.jpg', unit: '500 ml' });
    expect(suggestionFromOpenFacts({ status: 1, product: { product_name: 'Water', brands: 'Highland' } })?.title).toBe('Highland Water');
    expect(suggestionFromOpenFacts({ status: 0 })).toBeNull();
    expect(suggestionFromOpenFacts(null)).toBeNull();
  });
});
