import type { Metadata } from 'next';
import OrderStatus from '@/views/OrderStatus';

// Private order page reached from the emailed link: never indexed or previewed.
export const metadata: Metadata = {
  title: 'Your order',
  robots: { index: false, follow: false },
  referrer: 'no-referrer',
};

export default function OrderPage() {
  return <OrderStatus />;
}
