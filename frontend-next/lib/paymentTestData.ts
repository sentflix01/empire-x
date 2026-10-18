/**
 * Test-mode payment details published by the payment providers. Shown only
 * when the backend reports test keys (GET /api/subscriptions/plans → testMode),
 * never with live keys. No real money moves with these.
 *
 * Chapa: developer.chapa.co/test/testing-mobile and /test/testing-cards
 * Stripe: docs.stripe.com/testing
 */
export interface TestPhoneGroup { providers: string; numbers: string[]; otp?: string }
export interface TestCard { brand: string; number: string; expiry: string; cvv: string; note?: string }

export const CHAPA_TEST_PHONES: TestPhoneGroup[] = [
  { providers: 'telebirr · CBE Birr · COOPPay-ebirr', numbers: ['0900123456', '0900112233', '0900881111'] },
  { providers: 'Awash · Amole', numbers: ['0900123456', '0900112233', '0900881111'], otp: '12345' },
  { providers: 'M-Pesa', numbers: ['0700123456', '0700112233', '0700881111'] },
];

export const CHAPA_TEST_CARDS: TestCard[] = [
  { brand: 'Visa', number: '4200 0000 0000 0000', expiry: '12/34', cvv: '123' },
  { brand: 'Mastercard', number: '5400 0000 0000 0000', expiry: '12/34', cvv: '123' },
  { brand: 'American Express', number: '3700 0000 0000 0000', expiry: '12/34', cvv: '1234' },
  { brand: 'UnionPay', number: '6200 0000 0000 0000', expiry: '12/34', cvv: '123' },
  { brand: 'Diners', number: '3800 0000 0000 0000', expiry: '12/34', cvv: '123' },
];

export const STRIPE_TEST_CARDS: TestCard[] = [
  { brand: 'Visa (succeeds)', number: '4242 4242 4242 4242', expiry: 'Any future date', cvv: 'Any 3 digits' },
  { brand: 'Visa (declined)', number: '4000 0000 0000 9995', expiry: 'Any future date', cvv: 'Any 3 digits', note: 'Shows a failed payment' },
  { brand: 'Visa (3-D Secure)', number: '4000 0025 0000 3155', expiry: 'Any future date', cvv: 'Any 3 digits', note: 'Asks you to approve the payment' },
];
