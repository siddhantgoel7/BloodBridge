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
  const [ticketCount, setTicketCount] = useState(0);

  const fetchTicketCount = async () => {
    if (!user) return;
    const { data: profile } = await supabase.from("profiles").select("blood_type").eq("id", user.id).maybeSingle();
    if (!profile?.blood_type) return;

    // Get IDs of tickets this donor has already responded to
    const { data: responded } = await supabase
      .from("ticket_responses")
      .select("ticket_id")
      .eq("donor_id", user.id);
    
    const respondedIds = responded?.map(r => r.ticket_id) ?? [];

    const query = supabase
      .from("blood_tickets")
      .select("id", { count: "exact", head: true })
      .eq("status", "open")
      .eq("blood_type", profile.blood_type);
    
    if (respondedIds.length > 0) {
      query.not("id", "in", `(${respondedIds.join(',')})`);
    }
    
    const { count } = await query;
    setTicketCount(count ?? 0);
  };

  const playPing = () => {
    const audio = new Audio("https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3");
    audio.volume = 0.4;
    audio.play().catch(() => {});
  };

  useEffect(() => {
    if (!user) return;
    
    supabase.from("profiles").select("onboarded").eq("id", user.id).maybeSingle().then(({ data }) => {
      if (!data?.onboarded) navigate("/donor/onboarding", { replace: true });
      else {
        setChecking(false);
        fetchTicketCount();
      }
    });

    const channel = supabase.channel('tickets-badge')
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'blood_tickets' 
      }, async (payload) => {
        // Fetch profile to get blood type if not already known
        const { data: profile } = await supabase.from("profiles").select("blood_type").eq("id", user.id).maybeSingle();
        
        // Only ping if it matches donor's blood type
        if (payload.new.blood_type === profile?.blood_type && payload.new.status === 'open') {
          fetchTicketCount();
          playPing();
        }
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'blood_tickets' }, () => {
        fetchTicketCount();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, navigate]);

  if (checking) return <div className="flex min-h-screen items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;

  const links = [
    { to: "/donor", label: "Home", icon: Home, end: true },
    { to: "/donor/tickets", label: "Tickets", icon: Bell, badge: ticketCount },
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
                cn("flex flex-col items-center gap-1 py-3 text-xs font-medium relative",
                  isActive ? "text-primary" : "text-muted-foreground")
              }>
              <div className="relative">
                <l.icon className="h-5 w-5" />
                {l.badge !== undefined && l.badge > 0 && (
                  <span className="absolute -right-2 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[10px] text-destructive-foreground animate-in zoom-in">
                    {l.badge}
                  </span>
                )}
              </div>
              {l.label}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  );
}
