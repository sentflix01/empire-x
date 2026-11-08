import React from 'react';
import Link from 'next/link';

interface OrderUpdateBubbleProps {
  metadata: Record<string, unknown>;
  isMe: boolean;
}

type OrderStatus = 'confirmed' | 'shipped' | 'delivered' | 'cancelled';

/** Dark-mode–safe status classes using Tailwind tokens only (no hex). */
const STATUS_CLASSES: Record<OrderStatus, string> = {
  confirmed: 'bg-success-subtle text-success',
  delivered: 'bg-success-subtle text-success',
  shipped:   'bg-primary-subtle  text-primary  ',
  cancelled: 'bg-destructive-subtle   text-destructive    ',
};
const DEFAULT_STATUS_CLASS = 'bg-secondary text-muted-foreground';

export default function OrderUpdateBubble({ metadata }: OrderUpdateBubbleProps) {
  const orderId = typeof metadata.order_id === 'string' ? metadata.order_id : '';
  const status  = typeof metadata.status  === 'string' ? metadata.status  : '';

  const statusClass = STATUS_CLASSES[status as OrderStatus] ?? DEFAULT_STATUS_CLASS;

  // Truncate the order ID for display: last 8 hex chars
  const shortId = orderId.length > 8 ? `…${orderId.slice(-8)}` : orderId;

  return (
    <div className="rounded-xl border border-border bg-card shadow-sm max-w-[260px] overflow-hidden">
      <div className="flex items-center gap-2 px-3 py-2.5">
        <span className="text-lg shrink-0" aria-hidden="true">📦</span>
        <div className="flex-1 min-w-0">
          <p className="text-xs text-muted-foreground leading-tight">Order update</p>
          {shortId && (
            <p className="text-xs font-medium text-foreground truncate">#{shortId}</p>
          )}
        </div>
        {status && (
          <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full shrink-0 capitalize ${statusClass}`}>
            {status}
          </span>
        )}
      </div>
      {orderId && (
        <div className="border-t border-border/30 px-3 py-2">
          <Link
            href={`/orders/${orderId}`}
            className="block w-full text-center text-xs font-medium rounded-lg py-1.5 transition-colors bg-secondary text-foreground hover:bg-secondary/80"
          >
            View Order
          </Link>
        </div>
      )}
    </div>
  );
}
