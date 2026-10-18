'use client';
import React, { useEffect, useState } from 'react';
import { Loader2, Store } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { BUSINESS_CATEGORIES } from '@/lib/businessTemplates';
import { VisibilityFieldset, type BusinessVisibility } from '@/components/business/VisibilityChoice';

export interface BusinessChoice { id: string; business_name: string }

export interface NewBusiness {
  business_name: string;
  business_category: string;
  visibility: BusinessVisibility;
}

interface Props {
  open: boolean;
  /** "create" when the owner has no Business profile; "choose" when they have several. */
  mode: 'create' | 'choose';
  businesses: BusinessChoice[];
  /** Prefill from the site: the hero's business name and the matching category. */
  defaultName: string;
  defaultCategory: string;
  busy: boolean;
  onOpenChange: (open: boolean) => void;
  onCreate: (business: NewBusiness) => void;
  onChoose: (businessId: string) => void;
}

/**
 * The step before a website's first publish: every live site belongs to a
 * Business profile (plans, orders and payments attach to it). Instead of
 * sending the owner away from Studio, it is created or chosen here and the
 * publish continues.
 */
export default function PublishBusinessDialog({ open, mode, businesses, defaultName, defaultCategory, busy, onOpenChange, onCreate, onChoose }: Props) {
  const [name, setName] = useState(defaultName);
  const [category, setCategory] = useState(defaultCategory);
  const [visibility, setVisibility] = useState<BusinessVisibility>('public');
  const [chosen, setChosen] = useState('');

  useEffect(() => {
    if (!open) return;
    setName(defaultName);
    setCategory(defaultCategory);
    setVisibility('public');
    setChosen(businesses[0]?.id ?? '');
  }, [open, defaultName, defaultCategory, businesses]);

  const canCreate = name.trim().length > 0 && Boolean(category);

  return (
    <Dialog open={open} onOpenChange={(next: boolean) => { if (!busy) onOpenChange(next); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-foreground">
            <Store className="h-5 w-5 text-primary" aria-hidden="true" />
            {mode === 'create' ? 'Create your Business profile' : 'Which business is this website for?'}
          </DialogTitle>
          <DialogDescription>
            {mode === 'create'
              ? 'Every published website belongs to a Business profile, which holds your plan, orders and payment details. Your website is saved; it publishes as soon as this is done.'
              : 'Your website, its plan and its orders will belong to the business you choose.'}
          </DialogDescription>
        </DialogHeader>

        {mode === 'create' ? (
          <div className="space-y-4">
            <div>
              <label htmlFor="publish-business-name" className="mb-1.5 block text-sm font-medium text-foreground">Business name</label>
              <input
                id="publish-business-name"
                value={name}
                onChange={(e) => setName(e.target.value.slice(0, 120))}
                className="h-11 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                placeholder="e.g. Abebe's Coffee"
              />
            </div>
            <div>
              <label htmlFor="publish-business-category" className="mb-1.5 block text-sm font-medium text-foreground">Category</label>
              <select
                id="publish-business-category"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="h-11 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="">Choose a category</option>
                {BUSINESS_CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
            </div>
            <VisibilityFieldset value={visibility} onChange={setVisibility} disabled={busy} />
            <p className="text-xs text-muted-foreground">You can add a logo, contact details and payment accounts later from your Business profile.</p>
          </div>
        ) : (
          <fieldset className="space-y-2">
            <legend className="sr-only">Business profile</legend>
            {businesses.map((b) => (
              <label key={b.id} className={`flex cursor-pointer items-center gap-3 rounded-xl border p-3 text-sm ${chosen === b.id ? 'border-primary bg-primary/5' : 'border-border hover:bg-secondary'}`}>
                <input type="radio" name="publish-business" value={b.id} checked={chosen === b.id} onChange={() => setChosen(b.id)} />
                <span className="font-medium text-foreground">{b.business_name}</span>
              </label>
            ))}
          </fieldset>
        )}

        <DialogFooter className="gap-2">
          <button type="button" onClick={() => onOpenChange(false)} disabled={busy} className="rounded-full border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-secondary disabled:opacity-50">
            Not now
          </button>
          <button
            type="button"
            disabled={busy || (mode === 'create' ? !canCreate : !chosen)}
            onClick={() => (mode === 'create'
              ? onCreate({ business_name: name.trim(), business_category: category, visibility })
              : onChoose(chosen))}
            className="inline-flex items-center justify-center gap-2 rounded-full bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            {busy && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
            {mode === 'create' ? 'Create and publish' : 'Publish'}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
