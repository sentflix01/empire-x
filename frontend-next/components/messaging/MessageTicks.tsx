'use client';
import { AlertCircle, Check, CheckCheck, Clock } from 'lucide-react';
import { TICK_LABEL, type Tick } from '@/lib/readReceipts';

/** ✓ sent · ✓✓ delivered · blue ✓✓ seen. Labelled for screen readers. */
export default function MessageTicks({ tick, className = 'h-3.5 w-3.5' }: { tick: Tick; className?: string }) {
  const label = TICK_LABEL[tick];
  const common = { className: `${className} shrink-0`, 'aria-hidden': true as const };
  return (
    <span role="img" aria-label={label} title={label} className="inline-flex" data-tick={tick}>
      {tick === 'sending' && <Clock {...common} className={`${common.className} text-muted-foreground/60`} />}
      {tick === 'failed' && <AlertCircle {...common} className={`${common.className} text-destructive`} />}
      {tick === 'sent' && <Check {...common} className={`${common.className} text-muted-foreground`} />}
      {tick === 'delivered' && <CheckCheck {...common} className={`${common.className} text-muted-foreground`} />}
      {tick === 'seen' && <CheckCheck {...common} className={`${common.className} text-sky-500`} />}
    </span>
  );
}
