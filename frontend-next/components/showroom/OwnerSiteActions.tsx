'use client'
/**
 * OwnerSiteActions — what an owner can do with their website from its page
 * (audit 2026-11-14: the flow had no unpublish, and delete only existed on the
 * Showrooms list):
 *
 *   Edit                 opens Studio on this site (/showroom/create?edit=id)
 *   Unpublish            status → archived: visitors see "unavailable", the
 *                        site and its address are kept
 *   Publish again        status → published, with the same plan check as
 *                        Studio (402 → the plan page)
 *   Copy link            the public address
 *   Delete               permanent, after a confirmation dialog
 */
import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Copy, EyeOff, Globe, Loader2, Pencil, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { entities } from '@/lib/api/entities';
import client from '@/lib/api/client';

type ApiError = { error?: string; message?: string; businessId?: string; requiredTier?: string; draftId?: string } | null;

interface Props {
  site: { id: string; title?: string | null; status?: string | null; slug?: string | null };
  publicUrl: string;
  onStatusChange?: (status: string) => void;
}

export default function OwnerSiteActions({ site, publicUrl, onStatusChange }: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState<'status' | 'delete' | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const published = site.status === 'published';

  const changeStatus = async () => {
    const next = published ? 'archived' : 'published';
    setBusy('status');
    try {
      await entities.Showroom.update(site.id, { status: next });
      onStatusChange?.(next);
      toast.success(next === 'published' ? 'Your website is live again.' : 'Your website is unpublished. Visitors can no longer open it.');
    } catch (err) {
      const e = err as ApiError;
      if (e?.error === 'subscription_required' && e.businessId) {
        const q = new URLSearchParams({ businessId: e.businessId, draftId: site.id });
        if (e.requiredTier) q.set('requiredTier', e.requiredTier);
        router.push(`/business/subscription?${q.toString()}`);
        return;
      }
      toast.error(e?.message || 'Could not change the website status. Please try again.');
    } finally { setBusy(null); }
  };

  const copyLink = async () => {
    try { await navigator.clipboard.writeText(publicUrl); toast.success('Link copied'); }
    catch { toast.error('Could not copy the link'); }
  };

  const remove = async () => {
    setBusy('delete');
    try {
      await client.delete(`/api/showrooms/${site.id}`);
      toast.success('Website deleted');
      router.push('/showrooms');
    } catch (err) {
      toast.error((err as ApiError)?.message || 'Could not delete the website. Please try again.');
      setBusy(null);
    }
  };

  return (
    <div data-testid="owner-site-actions" className="flex flex-wrap items-center gap-2">
      <Link href={`/showroom/create?edit=${encodeURIComponent(site.id)}`}>
        <Button size="sm" variant="outline" className="h-8 rounded-full"><Pencil className="mr-1 h-3 w-3" aria-hidden="true" /> Edit</Button>
      </Link>
      {site.status !== 'draft' && (
        <Button size="sm" variant="outline" className="h-8 rounded-full" onClick={changeStatus} disabled={busy !== null}>
          {busy === 'status' ? <Loader2 className="mr-1 h-3 w-3 animate-spin" aria-hidden="true" />
            : published ? <EyeOff className="mr-1 h-3 w-3" aria-hidden="true" /> : <Globe className="mr-1 h-3 w-3" aria-hidden="true" />}
          {published ? 'Unpublish' : 'Publish again'}
        </Button>
      )}
      {published && (
        <Button size="sm" variant="outline" className="h-8 rounded-full" onClick={copyLink}><Copy className="mr-1 h-3 w-3" aria-hidden="true" /> Copy link</Button>
      )}
      <Button size="sm" variant="outline" className="h-8 rounded-full text-destructive hover:text-destructive" onClick={() => setConfirmDelete(true)} disabled={busy !== null}>
        <Trash2 className="mr-1 h-3 w-3" aria-hidden="true" /> Delete
      </Button>
      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete “{site.title || 'this website'}”?</AlertDialogTitle>
            <AlertDialogDescription>
              The website, its address and its QR code stop working for everyone. This cannot be undone.
              To hide it for a while instead, choose Unpublish.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep website</AlertDialogCancel>
            <AlertDialogAction onClick={(e: React.MouseEvent) => { e.preventDefault(); void remove(); }} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {busy === 'delete' ? 'Deleting…' : 'Delete website'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
