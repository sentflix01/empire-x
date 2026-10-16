import type { Metadata } from 'next';
import ProductDetail from '@/views/ProductDetail';
import { productMetadata } from '@/lib/sharePreview';

// Server component so shared product links get a real preview.
export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  return productMetadata(id);
}

export default function ProductPage() {
  return <ProductDetail />;
}
