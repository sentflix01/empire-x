'use client';
import Link from 'next/link';
import { XCircle, ShoppingBag, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function OrderCancelPage() {
  return (
    <div className="max-w-lg mx-auto px-4 py-12 text-center">
      <div className="w-20 h-20 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center mx-auto mb-6">
        <XCircle className="w-10 h-10 text-amber-600" />
      </div>

      <h1 className="font-display text-3xl font-bold mb-2">Payment Cancelled</h1>
      <p className="text-muted-foreground mb-8">
        You left before completing payment — you were not charged. Your cart is still saved.
      </p>

      <div className="bg-secondary/40 rounded-2xl p-5 mb-8 text-left">
        <h3 className="font-semibold text-sm mb-2">What happened?</h3>
        <p className="text-sm text-muted-foreground">
          No payment was taken. The items you selected are still in your cart and ready to purchase when you're ready.
        </p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <Link href="/cart" className="flex-1">
          <Button className="w-full h-11 rounded-full bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 font-semibold">
            <ShoppingBag className="w-4 h-4 mr-2" />
            Return to Cart
          </Button>
        </Link>
        <Link href="/marketplace" className="flex-1">
          <Button variant="outline" className="w-full h-11 rounded-full">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Browse Marketplace
          </Button>
        </Link>
      </div>
    </div>
  );
}
