import type { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import {
  Bot,
  Briefcase,
  CheckCircle2,
  CreditCard,
  GraduationCap,
  LayoutGrid,
  MapPin,
  MessageCircle,
  Package,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Store,
  Users,
  Zap,
} from 'lucide-react';

export const metadata: Metadata = {
  title: "Empire X - Africa's Superapp",
  description:
    "Empire X is Africa's superapp for social networking, business showrooms, marketplace, messaging, payments, AI, jobs, courses, and local services.",
  openGraph: {
    title: "Empire X - Africa's Superapp",
    description: 'Social, commerce, payments, services, and AI in one trusted platform.',
    images: ['/brand/empire-x-logo.png'],
  },
};

const modules = [
  { title: 'Social Feed', desc: 'Posts, stories, trends, and community discovery.', Icon: Users },
  { title: 'Marketplace', desc: 'Products, orders, reviews, and local sellers.', Icon: ShoppingBag },
  { title: 'Showrooms', desc: 'Mini websites for every business profile.', Icon: Store },
  { title: 'Wallet', desc: 'Payments, balances, invoices, and transaction history.', Icon: CreditCard },
  { title: 'Messaging', desc: 'Direct chat, groups, channels, and notifications.', Icon: MessageCircle },
  { title: 'AI Assistant', desc: 'Help users write, search, sell, and grow faster.', Icon: Bot },
  { title: 'Tasks', desc: 'Post errands, collect bids, and coordinate delivery.', Icon: Zap },
  { title: 'Jobs', desc: 'Hire locally and find better work opportunities.', Icon: Briefcase },
  { title: 'Courses', desc: 'Teach, learn, and sell digital education.', Icon: GraduationCap },
];

const stats = [
  ['9+', 'Core apps'],
  ['27', 'Showroom templates'],
  ['24/7', 'AI help'],
  ['1', 'Connected empire'],
];

const previewRows = [
  ['Feed', 'Aster shared a showroom launch', 'Live'],
  ['Order', 'Coffee pack paid with wallet', 'Paid'],
  ['Task', 'Delivery bid accepted', 'Open'],
];

export default function LandingPage() {
  return (
    <main className="min-h-screen overflow-x-hidden bg-slate-950 text-white">
      <section className="relative min-h-[88svh] overflow-hidden bg-[linear-gradient(135deg,#0f172a_0%,#1d4ed8_47%,#7c3aed_100%)]">
        <div className="absolute inset-0 opacity-35 [background-image:linear-gradient(rgba(255,255,255,0.12)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.12)_1px,transparent_1px)] [background-size:48px_48px]" />
        <div className="absolute inset-x-0 bottom-0 h-44 bg-gradient-to-t from-slate-950 to-transparent" />

        <div className="absolute left-[6%] top-28 hidden w-56 rotate-[-7deg] rounded-2xl border border-white/14 bg-white/12 p-4 shadow-2xl shadow-slate-950/30 backdrop-blur-xl lg:block">
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-400 text-slate-950">
              <CreditCard className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-white/60">Wallet</p>
              <p className="text-sm font-bold">12,480 ETB</p>
            </div>
          </div>
          <div className="space-y-2">
            <div className="h-2 rounded-full bg-white/30" />
            <div className="h-2 w-2/3 rounded-full bg-white/18" />
          </div>
        </div>

        <div className="absolute right-[7%] top-24 hidden w-64 rotate-[6deg] rounded-3xl border border-white/14 bg-slate-950/55 p-3 shadow-2xl shadow-slate-950/45 backdrop-blur-xl lg:block">
          <div className="rounded-2xl bg-white p-3 text-slate-950">
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="h-9 w-9 rounded-xl bg-blue-600" />
                <div>
                  <p className="text-xs text-slate-500">Showroom</p>
                  <p className="text-sm font-bold">Mini website</p>
                </div>
              </div>
              <CheckCircle2 className="h-5 w-5 text-emerald-500" />
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div className="h-14 rounded-xl bg-blue-100" />
              <div className="h-14 rounded-xl bg-purple-100" />
              <div className="h-14 rounded-xl bg-emerald-100" />
            </div>
          </div>
        </div>

        <div className="absolute bottom-20 left-1/2 hidden w-[min(82vw,860px)] -translate-x-1/2 grid-cols-3 gap-3 opacity-95 md:grid">
          {previewRows.map(([type, text, status]) => (
            <div key={text} className="rounded-2xl border border-white/12 bg-white/10 p-4 shadow-xl shadow-slate-950/25 backdrop-blur-xl">
              <div className="mb-3 flex items-center justify-between text-xs text-white/65">
                <span>{type}</span>
                <span className="rounded-full bg-emerald-400/18 px-2 py-1 text-emerald-100">{status}</span>
              </div>
              <p className="text-sm font-semibold leading-snug">{text}</p>
            </div>
          ))}
        </div>

        <div className="relative z-10 mx-auto flex min-h-[82svh] max-w-6xl flex-col items-center justify-center px-6 pb-28 pt-16 text-center">
          <Image
            src="/brand/empire-x-logo.png"
            alt="Empire X"
            width={88}
            height={88}
            className="mb-6 h-20 w-20 rounded-3xl object-cover shadow-2xl shadow-blue-950/45 ring-1 ring-white/25"
            priority
          />
          <p className="mb-4 inline-flex max-w-[22rem] flex-wrap items-center justify-center gap-2 rounded-full border border-white/16 bg-white/10 px-4 py-2 text-center text-xs font-semibold text-white/85 backdrop-blur-xl sm:max-w-full sm:text-sm">
            <Sparkles className="h-4 w-4 text-emerald-300" />
            <span>Social, commerce, payments, services, and AI</span>
          </p>
          <h1 className="max-w-5xl text-4xl font-black leading-tight tracking-normal sm:text-7xl lg:text-8xl">
            Empire X
            <span className="block text-white/78">
              <span className="block sm:inline">Africa&apos;s</span>
              <span className="hidden sm:inline"> </span>
              <span className="block sm:inline">Superapp</span>
            </span>
          </h1>
          <p className="mt-6 max-w-[21rem] text-sm font-medium leading-7 text-white/76 sm:max-w-2xl sm:text-xl">
            One trusted platform where people connect, businesses sell, customers pay, teams chat, tasks move, and AI helps the whole ecosystem grow.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/register"
              className="inline-flex h-12 items-center justify-center rounded-2xl bg-white px-7 text-sm font-extrabold text-blue-700 shadow-xl shadow-slate-950/25 transition-all duration-200 hover:bg-blue-50"
            >
              Create Your Account
            </Link>
            <Link
              href="/feed"
              className="inline-flex h-12 items-center justify-center rounded-2xl border border-white/24 bg-white/10 px-7 text-sm font-bold text-white backdrop-blur-xl transition-all duration-200 hover:bg-white/16"
            >
              Explore the App
            </Link>
          </div>
        </div>
      </section>

      <section className="-mt-14 px-4 pb-20 sm:px-6">
        <div className="mx-auto grid w-full max-w-5xl grid-cols-2 gap-3 rounded-3xl border border-white/10 bg-slate-900/90 p-3 shadow-2xl shadow-slate-950/35 backdrop-blur-xl md:grid-cols-4">
          {stats.map(([value, label]) => (
            <div key={label} className="rounded-2xl bg-white/[0.06] px-4 py-5 text-center">
              <p className="text-3xl font-black text-white">{value}</p>
              <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-white/52">{label}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-slate-50 px-6 py-20 text-slate-950">
        <div className="mx-auto max-w-6xl">
          <div className="mb-12 max-w-3xl">
            <p className="mb-3 text-sm font-bold uppercase tracking-wide text-blue-600">Everything Connected</p>
            <h2 className="text-4xl font-black tracking-normal sm:text-5xl">A full digital economy in one app.</h2>
            <p className="mt-4 text-lg leading-8 text-slate-600">
              Empire X is designed as a daily operating system for users, creators, merchants, service providers, and local communities.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            {modules.map(({ title, desc, Icon }) => (
              <article key={title} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-xl">
                <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
                  <Icon className="h-6 w-6" />
                </div>
                <h3 className="text-lg font-extrabold">{title}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">{desc}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-white px-6 py-20 text-slate-950">
        <div className="mx-auto grid max-w-6xl gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
          <div>
            <p className="mb-3 text-sm font-bold uppercase tracking-wide text-purple-600">Built For Trust</p>
            <h2 className="text-4xl font-black tracking-normal sm:text-5xl">From profile to payment, every action feels connected.</h2>
            <p className="mt-5 text-lg leading-8 text-slate-600">
              Users can discover a business, view its showroom, message the seller, pay, track the order, and come back through the social feed.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              {['Verified profiles', 'Secure wallet', 'Business websites', 'Local discovery'].map(item => (
                <span key={item} className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-4 py-2 text-sm font-bold text-slate-700">
                  <ShieldCheck className="h-4 w-4 text-emerald-500" />
                  {item}
                </span>
              ))}
            </div>
          </div>

          <div className="relative min-h-[430px] overflow-hidden rounded-3xl bg-[linear-gradient(135deg,#0f172a,#2563eb_52%,#7c3aed)] p-5 shadow-2xl shadow-blue-950/20">
            <div className="absolute inset-0 opacity-30 [background-image:linear-gradient(rgba(255,255,255,0.16)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.16)_1px,transparent_1px)] [background-size:36px_36px]" />
            <div className="relative mx-auto max-w-sm rounded-[2rem] bg-slate-950/68 p-3 shadow-2xl ring-1 ring-white/18">
              <div className="rounded-[1.5rem] bg-slate-50 p-4 text-slate-950">
                <div className="mb-5 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Image src="/brand/empire-x-logo.png" alt="" width={40} height={40} className="h-10 w-10 rounded-xl object-cover" />
                    <div>
                      <p className="text-sm font-black">Empire X</p>
                      <p className="text-xs text-slate-500">Superapp dashboard</p>
                    </div>
                  </div>
                  <LayoutGrid className="h-5 w-5 text-blue-600" />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-2xl bg-blue-600 p-4 text-white">
                    <Store className="mb-5 h-5 w-5" />
                    <p className="text-xs text-white/70">Showroom</p>
                    <p className="text-lg font-black">Live</p>
                  </div>
                  <div className="rounded-2xl bg-emerald-500 p-4 text-white">
                    <Package className="mb-5 h-5 w-5" />
                    <p className="text-xs text-white/75">Orders</p>
                    <p className="text-lg font-black">128</p>
                  </div>
                  <div className="rounded-2xl bg-purple-600 p-4 text-white">
                    <MessageCircle className="mb-5 h-5 w-5" />
                    <p className="text-xs text-white/75">Messages</p>
                    <p className="text-lg font-black">Fast</p>
                  </div>
                  <div className="rounded-2xl bg-slate-900 p-4 text-white">
                    <MapPin className="mb-5 h-5 w-5" />
                    <p className="text-xs text-white/65">Nearby</p>
                    <p className="text-lg font-black">On</p>
                  </div>
                </div>

                <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <p className="text-sm font-black">AI growth tip</p>
                    <Bot className="h-5 w-5 text-purple-600" />
                  </div>
                  <p className="text-sm leading-6 text-slate-600">Turn your top product into a showroom offer and share it to the feed.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-slate-950 px-6 py-20 text-white">
        <div className="mx-auto max-w-4xl text-center">
          <h2 className="text-4xl font-black tracking-normal sm:text-5xl">Start with one account. Grow into an empire.</h2>
          <p className="mx-auto mt-5 max-w-2xl text-lg leading-8 text-white/65">
            Join the preview, test the superapp experience, and build the business presence that customers can discover, trust, message, and pay.
          </p>
          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <Link href="/register" className="inline-flex h-12 items-center justify-center rounded-2xl bg-white px-7 text-sm font-extrabold text-blue-700">
              Create Your Account
            </Link>
            <Link href="/showroom/templates" className="inline-flex h-12 items-center justify-center rounded-2xl bg-gradient-to-r from-blue-600 to-purple-600 px-7 text-sm font-extrabold text-white shadow-lg shadow-blue-950/30 ring-1 ring-white/15 hover:from-blue-500 hover:to-purple-500">
              View Showroom Templates
            </Link>
          </div>
        </div>
      </section>

      <footer className="border-t border-white/10 bg-slate-950 px-6 py-8 text-sm text-white/55">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 sm:flex-row">
          <p>© 2026 Empire X. Built for Africa.</p>
          <div className="flex gap-5">
            <Link href="/login" className="hover:text-white">Sign In</Link>
            <Link href="/register" className="hover:text-white">Register</Link>
            <Link href="/marketplace" className="hover:text-white">Marketplace</Link>
            <Link href="/showrooms" className="hover:text-white">Showrooms</Link>
          </div>
        </div>
      </footer>
    </main>
  );
}
