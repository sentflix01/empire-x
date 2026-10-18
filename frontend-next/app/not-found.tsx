'use client';
import Link from 'next/link';
import { useTranslation } from 'react-i18next';
import BrandLogo from '@/components/brand/BrandLogo';

export default function NotFound() {
  const { t } = useTranslation();
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center px-6">
        <BrandLogo className="w-16 h-16 mx-auto mb-4" size={64} label="Nodbusiness" />
        <h1 className="font-display text-4xl font-bold mb-2">404</h1>
        <p className="text-muted-foreground text-lg mb-8">{t('notFound.message')}</p>
        <Link href="/"
          className="inline-flex items-center gap-2 px-6 py-3 bg-primary hover:bg-primary/90 text-white font-semibold rounded-full transition-colors">
          {t('notFound.goHome')}
        </Link>
      </div>
    </div>
  );
}
