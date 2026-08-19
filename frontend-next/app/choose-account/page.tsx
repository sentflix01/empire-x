import Link from 'next/link';
import Image from 'next/image';
import { Users, Store, ArrowLeft } from 'lucide-react';

export const metadata = { title: 'Choose Account Type — Nodbusiness' };

export default function ChooseAccountPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-slate-950 flex flex-col items-center justify-center px-6 py-12">
      {/* Back to landing */}
      <Link href="/landing" className="flex items-center gap-2 text-white/60 hover:text-white text-sm mb-10 self-start max-w-md w-full">
        <ArrowLeft className="w-4 h-4" /> Back
      </Link>

      <div className="w-full max-w-md">
        {/* Logo + heading */}
        <div className="flex flex-col items-center text-center mb-8">
          <Image
            src="/brand/nodbusiness-logo-white.svg"
            alt="Nodbusiness"
            width={240}
            height={36}
            className="h-9 w-auto mb-6"
          />
          <h1 className="text-3xl font-black text-white">Choose Your Account Type</h1>
          <p className="text-white/60 mt-2 text-sm leading-relaxed">
            You can always add a business profile later from your account settings.
          </p>
        </div>

        {/* Options */}
        <div className="space-y-4">
          {/* Personal */}
          <Link
            href="/register?type=personal"
            className="group flex items-start gap-4 p-5 rounded-2xl border border-white/10 bg-white/5 hover:bg-white/10 hover:border-white/20 transition-all"
          >
            <div className="w-12 h-12 rounded-xl bg-blue-600/20 flex items-center justify-center shrink-0 group-hover:bg-blue-600/30 transition-colors">
              <Users className="w-6 h-6 text-blue-400" />
            </div>
            <div className="min-w-0">
              <p className="text-white font-bold text-base">Personal Profile</p>
              <p className="text-white/55 text-sm mt-1 leading-relaxed">
                Connect with people, share posts, follow businesses, buy products, and explore the social feed.
              </p>
              <span className="inline-block mt-3 text-xs font-semibold text-blue-400 bg-blue-400/10 px-2.5 py-1 rounded-full">
                Free forever
              </span>
            </div>
          </Link>

          {/* Business */}
          <Link
            href="/register?type=business"
            className="group flex items-start gap-4 p-5 rounded-2xl border border-white/10 bg-white/5 hover:bg-white/10 hover:border-amber-400/40 transition-all"
          >
            <div className="w-12 h-12 rounded-xl bg-amber-500/20 flex items-center justify-center shrink-0 group-hover:bg-amber-500/30 transition-colors">
              <Store className="w-6 h-6 text-amber-400" />
            </div>
            <div className="min-w-0">
              <p className="text-white font-bold text-base">Business Profile</p>
              <p className="text-white/55 text-sm mt-1 leading-relaxed">
                Get a mini-website (showroom), sell products, accept payments, post jobs, and reach thousands of local customers.
              </p>
              <span className="inline-block mt-3 text-xs font-semibold text-amber-400 bg-amber-400/10 px-2.5 py-1 rounded-full">
                Includes personal profile
              </span>
            </div>
          </Link>
        </div>

        {/* Already have account */}
        <p className="text-center text-white/45 text-sm mt-8">
          Already have an account?{' '}
          <Link href="/login" className="text-blue-400 font-semibold hover:underline">
            Sign In
          </Link>
        </p>
      </div>
    </div>
  );
}
