import { Link, NavLink, Outlet, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Droplets, LayoutDashboard, PlusCircle, Boxes, BarChart3, LogOut, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface Hospital { id: string; name: string; city: string | null }

export default function HospitalLayout() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [hospital, setHospital] = useState<Hospital | null>(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from("hospital_staff")
        .select("hospital:hospitals(id, name, city)")
        .eq("user_id", user.id)
        .maybeSingle();
      const h = (data?.hospital as unknown) as Hospital | null;
      if (!h) {
        navigate("/hospital/onboarding", { replace: true });
        return;
      }
      setHospital(h);
      setChecking(false);
    })();
  }, [user, navigate]);

  if (checking) {
    return <div className="flex min-h-screen items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  }

  const links = [
    { to: "/hospital", label: "Dashboard", icon: LayoutDashboard, end: true },
    { to: "/hospital/tickets/new", label: "New ticket", icon: PlusCircle },
    { to: "/hospital/inventory", label: "Inventory", icon: Boxes },
    { to: "/hospital/stats", label: "Stats", icon: BarChart3 },
  ];

  return (
    <div className="min-h-screen bg-muted/30">
      <header className="border-b border-border bg-background">
        <div className="container flex h-16 items-center justify-between">
          <Link to="/hospital" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-gradient-accent">
              <Droplets className="h-4 w-4 text-accent-foreground" />
            </div>
            <div>
              <div className="text-sm font-semibold leading-none">BloodLink</div>
              <div className="text-xs text-muted-foreground">{hospital?.name}</div>
            </div>
          </Link>
          <div className="flex items-center gap-2">
            <span className="hidden text-sm text-muted-foreground sm:inline">{user?.email}</span>
            <Button variant="ghost" size="sm" onClick={() => signOut().then(() => navigate("/"))}>
              <LogOut className="mr-2 h-4 w-4" /> Sign out
            </Button>
          </div>
        </div>
        <nav className="container flex gap-1 overflow-x-auto pb-2">
          {links.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              end={l.end}
              className={({ isActive }) =>
                cn(
                  "inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                  isActive ? "bg-primary-soft text-primary" : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )
              }
            >
              <l.icon className="h-4 w-4" /> {l.label}
            </NavLink>
          ))}
        </nav>
      </header>
      <main className="container py-8 animate-fade-in">
        <Outlet context={{ hospital }} />
      </main>
    </div>
  );
}
