import { Link, NavLink, Outlet, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Droplets, Home, Bell, History, LogOut, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export default function DonorLayout() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("onboarded").eq("id", user.id).maybeSingle().then(({ data }) => {
      if (!data?.onboarded) navigate("/donor/onboarding", { replace: true });
      else setChecking(false);
    });
  }, [user, navigate]);

  if (checking) return <div className="flex min-h-screen items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;

  const links = [
    { to: "/donor", label: "Home", icon: Home, end: true },
    { to: "/donor/tickets", label: "Tickets", icon: Bell },
    { to: "/donor/history", label: "History", icon: History },
  ];

  return (
    <div className="min-h-screen bg-muted/30 pb-20">
      <header className="border-b border-border bg-background">
        <div className="container flex h-16 items-center justify-between">
          <Link to="/donor" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-gradient-accent">
              <Droplets className="h-4 w-4 text-accent-foreground" />
            </div>
            <span className="font-semibold">BloodLink</span>
          </Link>
          <Button variant="ghost" size="sm" onClick={() => signOut().then(() => navigate("/"))}>
            <LogOut className="mr-2 h-4 w-4" /> Sign out
          </Button>
        </div>
      </header>
      <main className="container py-6 animate-fade-in">
        <Outlet />
      </main>
      <nav className="fixed bottom-0 left-0 right-0 border-t border-border bg-background/95 backdrop-blur">
        <div className="container grid grid-cols-3">
          {links.map((l) => (
            <NavLink key={l.to} to={l.to} end={l.end}
              className={({ isActive }) =>
                cn("flex flex-col items-center gap-1 py-3 text-xs font-medium",
                  isActive ? "text-primary" : "text-muted-foreground")
              }>
              <l.icon className="h-5 w-5" /> {l.label}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  );
}
