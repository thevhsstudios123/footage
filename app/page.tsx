import Link from "next/link";
import { Zap, Shield, Smartphone, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PLAN_PRICING } from "@/lib/plans";

export default function LandingPage() {
  return (
    <main className="relative min-h-dvh">
      {/* Header */}
      <header className="container flex items-center justify-between py-6">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-fuchsia-500 via-violet-500 to-indigo-500 text-sm font-black text-white shadow-lg shadow-violet-500/30">
            S
          </div>
          <span className="font-bold tracking-tight">SkySnap</span>
        </div>
        <nav className="flex items-center gap-3 text-sm">
          <Link
            href="/sign-in"
            className="text-muted-foreground hover:text-foreground"
          >
            Sign in
          </Link>
          <Button size="sm" variant="gradient" asChild>
            <Link href="/dashboard">Try free</Link>
          </Button>
        </nav>
      </header>

      {/* Hero */}
      <section className="container flex flex-col items-center py-12 text-center md:py-24">
        <span className="mb-4 inline-flex rounded-full border border-border bg-card/50 px-3 py-1 text-xs font-medium text-muted-foreground backdrop-blur">
          ✨ AI cinematic drone shots in 60 seconds
        </span>
        <h1 className="max-w-3xl bg-gradient-to-b from-white via-white to-white/70 bg-clip-text text-4xl font-black leading-tight tracking-tight text-transparent md:text-6xl">
          Turn any photo into cinematic drone footage
        </h1>
        <p className="mt-4 max-w-xl text-base text-muted-foreground md:text-lg">
          Your face, untouched. Your world, transformed.
        </p>

        <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row">
          <Button size="lg" variant="gradient" asChild>
            <Link href="/dashboard">Try free — no credit card</Link>
          </Button>
          <p className="text-xs text-muted-foreground">
            3 free clips · No signup required to try
          </p>
        </div>

        {/* Before/after-ish mock */}
        <div className="relative mt-14 w-full max-w-4xl">
          <div className="relative overflow-hidden rounded-3xl border border-border bg-card/40 shadow-2xl shadow-black/40 backdrop-blur">
            <div className="grid grid-cols-2">
              <div className="relative aspect-video bg-gradient-to-br from-slate-700 via-slate-800 to-slate-900">
                <div className="absolute left-3 top-3 rounded-full bg-black/60 px-2.5 py-1 text-[11px] font-medium text-white/80 backdrop-blur">
                  Before
                </div>
                <div className="flex h-full items-center justify-center text-6xl">
                  📷
                </div>
              </div>
              <div className="relative aspect-video bg-gradient-to-br from-fuchsia-500/30 via-violet-500/30 to-indigo-500/40">
                <div className="absolute left-3 top-3 rounded-full bg-black/60 px-2.5 py-1 text-[11px] font-medium text-white/80 backdrop-blur">
                  After
                </div>
                <div className="flex h-full items-center justify-center text-6xl">
                  🚁
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="container py-16">
        <div className="grid gap-4 md:grid-cols-3">
          <FeatureCard
            icon={<Zap className="h-5 w-5" />}
            title="Ready in 60 seconds"
            body="Upload a photo, pick a style, get a share-ready cinematic clip."
          />
          <FeatureCard
            icon={<Shield className="h-5 w-5" />}
            title="Face never altered"
            body="We mask your face before generation and restore every frame."
          />
          <FeatureCard
            icon={<Smartphone className="h-5 w-5" />}
            title="Post directly to Reels"
            body="9:16 export, no watermark on Pro, share to Instagram + TikTok."
          />
        </div>
      </section>

      {/* Pricing */}
      <section className="container py-16">
        <h2 className="mb-2 text-center text-3xl font-bold md:text-4xl">
          Simple pricing
        </h2>
        <p className="mb-10 text-center text-muted-foreground">
          Start free. Upgrade when you want more clips.
        </p>
        <div className="grid gap-4 md:grid-cols-3">
          <PriceCard
            name="Free"
            price={PLAN_PRICING.free.monthly}
            features={[
              "3 clips / month",
              "5 sec clips",
              "Standard quality",
              "Watermark",
            ]}
            ctaLabel="Try free"
            href="/dashboard"
          />
          <PriceCard
            name="Pro"
            price={PLAN_PRICING.pro.monthly}
            features={[
              "30 clips / month",
              "HD quality",
              "No watermark",
              "Priority queue",
            ]}
            highlight
            ctaLabel="Start Pro"
            href="/dashboard?upgrade=pro"
          />
          <PriceCard
            name="Creator"
            price={PLAN_PRICING.creator.monthly}
            features={[
              "Unlimited clips",
              "4K quality",
              "4 exclusive styles",
              "Priority queue",
            ]}
            ctaLabel="Go Creator"
            href="/dashboard?upgrade=creator"
          />
        </div>
      </section>

      <footer className="container border-t border-border py-8 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} SkySnap. Your photos are processed securely
        and deleted within 1 hour.
      </footer>
    </main>
  );
}

function FeatureCard({
  icon,
  title,
  body,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card/60 p-6 backdrop-blur">
      <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-primary/15 text-primary">
        {icon}
      </div>
      <h3 className="mb-1 text-lg font-semibold">{title}</h3>
      <p className="text-sm text-muted-foreground">{body}</p>
    </div>
  );
}

function PriceCard({
  name,
  price,
  features,
  ctaLabel,
  href,
  highlight,
}: {
  name: string;
  price: number;
  features: string[];
  ctaLabel: string;
  href: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={`rounded-2xl border p-6 ${
        highlight
          ? "border-primary bg-primary/5 ring-2 ring-primary/30"
          : "border-border bg-card/60"
      }`}
    >
      <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        {name}
      </div>
      <div className="mt-2">
        <span className="text-4xl font-bold">${price.toFixed(2)}</span>
        <span className="text-sm text-muted-foreground">/mo</span>
      </div>
      <ul className="mt-5 space-y-2 text-sm">
        {features.map((f) => (
          <li key={f} className="flex items-start gap-2">
            <Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-primary" />
            <span>{f}</span>
          </li>
        ))}
      </ul>
      <Button
        variant={highlight ? "gradient" : "outline"}
        className="mt-6 w-full"
        asChild
      >
        <Link href={href}>{ctaLabel}</Link>
      </Button>
    </div>
  );
}
