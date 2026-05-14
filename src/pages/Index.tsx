import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Droplets, MapPin, Zap, ShieldCheck, Activity, Hospital } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

const Index = () => {
  const { user, role } = useAuth();
  const dashHref = role === "hospital_staff" ? "/hospital" : "/donor";

  return (
    <div className="min-h-screen bg-background">
      {/* Nav */}
      <header className="border-b border-border/60 bg-background/80 backdrop-blur sticky top-0 z-50">
        <div className="container flex h-16 items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-gradient-accent shadow-glow">
              <Droplets className="h-4 w-4 text-accent-foreground" />
            </div>
            <span className="text-lg font-bold tracking-tight">BloodLink</span>
          </Link>
          <nav className="flex items-center gap-2">
            {user ? (
              <Button asChild><Link to={dashHref}>Open dashboard</Link></Button>
            ) : (
              <>
                <Button variant="ghost" asChild><Link to="/auth">Sign in</Link></Button>
                <Button asChild><Link to="/auth?mode=signup">Get started</Link></Button>
              </>
            )}
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-soft">
        <div className="container py-20 lg:py-28">
          <div className="mx-auto max-w-3xl text-center">
            <div className="inline-flex items-center gap-2 rounded-full border border-accent/20 bg-accent-soft px-3 py-1 text-xs font-medium text-accent">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent opacity-75"></span>
                <span className="relative inline-flex h-2 w-2 rounded-full bg-accent"></span>
              </span>
              Live donor matching
            </div>
            <h1 className="mt-6 text-4xl font-bold tracking-tight text-foreground sm:text-6xl">
              Connect blood donors to hospitals <span className="bg-gradient-hero bg-clip-text text-transparent">in real time.</span>
            </h1>
            <p className="mt-6 text-lg leading-relaxed text-muted-foreground">
              BloodLink matches verified donors to nearby hospitals in seconds — geospatial search, blood-type compatibility, live ticket updates, and verified donations with a single QR scan.
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Button size="lg" asChild><Link to="/auth?mode=signup&role=donor">I want to donate</Link></Button>
              <Button size="lg" variant="outline" asChild><Link to="/auth?mode=signup&role=hospital_staff">I'm a hospital</Link></Button>
            </div>
          </div>
        </div>
      </section>

      {/* Stats strip */}
      <section className="border-y border-border/60 bg-card">
        <div className="container grid grid-cols-2 gap-6 py-10 sm:grid-cols-4">
          {[
            { v: "<60s", l: "Average match time" },
            { v: "8", l: "Blood types supported" },
            { v: "10km", l: "Default search radius" },
            { v: "100%", l: "Verified donations" },
          ].map((s) => (
            <div key={s.l} className="text-center">
              <div className="text-3xl font-bold text-primary">{s.v}</div>
              <div className="mt-1 text-sm text-muted-foreground">{s.l}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="container py-20">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">Built for the moments that matter</h2>
          <p className="mt-4 text-muted-foreground">Every minute counts. BloodLink removes the friction between hospitals and donors.</p>
        </div>

        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {[
            { icon: MapPin, title: "Geospatial matching", body: "Haversine search finds the closest compatible donors within your hospital's radius." },
            { icon: Zap, title: "Real-time tickets", body: "Live updates as donors accept, check in, and complete donations — powered by Realtime." },
            { icon: ShieldCheck, title: "Verified donations", body: "QR check-in, atomic ledger, and 56-day cooldown enforcement." },
            { icon: Activity, title: "Smart compatibility", body: "Built-in ABO/Rh compatibility logic so you only see donors who can actually help." },
            { icon: Hospital, title: "Hospital dashboard", body: "Inventory tracking, ticket lifecycle, and stats across blood types and urgency levels." },
            { icon: Droplets, title: "Donor portal", body: "One-tap availability, ticket alerts, and a points + history record of your impact." },
          ].map((f) => (
            <div key={f.title} className="rounded-lg border border-border bg-card p-6 shadow-card transition-shadow hover:shadow-elevated">
              <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary-soft text-primary">
                <f.icon className="h-5 w-5" />
              </div>
              <h3 className="mt-4 font-semibold">{f.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{f.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="container pb-20">
        <div className="rounded-2xl bg-gradient-hero px-8 py-14 text-center shadow-elevated">
          <h2 className="text-3xl font-bold text-primary-foreground">Ready to save lives?</h2>
          <p className="mt-3 text-primary-foreground/90">Sign up in under a minute. No credit card required.</p>
          <div className="mt-6 flex justify-center gap-3">
            <Button size="lg" variant="secondary" asChild><Link to="/auth?mode=signup">Create account</Link></Button>
          </div>
        </div>
      </section>

      <footer className="border-t border-border/60 py-8">
        <div className="container text-center text-sm text-muted-foreground">
          © {new Date().getFullYear()} BloodLink — Real-time blood donor matching.
        </div>
      </footer>
    </div>
  );
};

export default Index;
