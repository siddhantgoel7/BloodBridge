import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Award, Bell, Clock, Droplets } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

interface Profile {
  full_name: string; blood_type: string | null; is_available: boolean;
  points: number; total_donations: number; cooldown_until: string | null;
}

export default function Home() {
  const { user } = useAuth();
  const [p, setP] = useState<Profile | null>(null);
  const [openTickets, setOpenTickets] = useState(0);

  const load = async () => {
    if (!user) return;
    const { data } = await supabase.from("profiles")
      .select("full_name, blood_type, is_available, points, total_donations, cooldown_until")
      .eq("id", user.id).maybeSingle();
    setP(data as Profile | null);
    const { count } = await supabase.from("blood_tickets").select("id", { count: "exact", head: true }).in("status", ["open", "in_progress"]);
    setOpenTickets(count ?? 0);
  };

  useEffect(() => { load(); }, [user?.id]);

  const toggleAvailability = async (val: boolean) => {
    if (!user) return;
    const { error } = await supabase.from("profiles").update({ is_available: val }).eq("id", user.id);
    if (error) { toast.error(error.message); return; }
    toast.success(val ? "You're now available" : "You're now unavailable");
    load();
  };

  const cooldown = p?.cooldown_until && new Date(p.cooldown_until) > new Date() ? p.cooldown_until : null;

  return (
    <div className="space-y-5">
      <div>
        <p className="text-sm text-muted-foreground">Welcome back</p>
        <h1 className="text-2xl font-bold">{p?.full_name || "Donor"}</h1>
      </div>

      <Card className="bg-gradient-hero text-primary-foreground border-0 shadow-elevated">
        <CardContent className="p-6">
          <div className="flex items-start justify-between">
            <div>
              <div className="text-xs uppercase tracking-wide opacity-80">Your blood type</div>
              <div className="mt-1 text-5xl font-bold">{p?.blood_type || "—"}</div>
            </div>
            <Droplets className="h-10 w-10 opacity-50" />
          </div>
          <div className="mt-6 flex items-center justify-between rounded-lg bg-white/10 p-3">
            <div>
              <div className="text-sm font-medium">Available to donate</div>
              <div className="text-xs opacity-80">{p?.is_available ? "Visible to nearby hospitals" : "You won't receive alerts"}</div>
            </div>
            <Switch checked={!!p?.is_available} onCheckedChange={toggleAvailability} />
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 gap-3">
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary-soft text-primary"><Award className="h-5 w-5" /></div>
            <div>
              <div className="text-xl font-bold">{p?.points ?? 0}</div>
              <div className="text-xs text-muted-foreground">Points</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-md bg-accent-soft text-accent"><Droplets className="h-5 w-5" /></div>
            <div>
              <div className="text-xl font-bold">{p?.total_donations ?? 0}</div>
              <div className="text-xs text-muted-foreground">Donations</div>
            </div>
          </CardContent>
        </Card>
      </div>

      {cooldown && (
        <Card className="border-warning/30 bg-warning/5">
          <CardContent className="flex items-center gap-3 p-4">
            <Clock className="h-5 w-5 text-warning" />
            <div className="text-sm">
              <div className="font-medium">Cooldown active</div>
              <div className="text-muted-foreground">You can donate again on {format(new Date(cooldown), "PPP")}.</div>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><Bell className="h-4 w-4 text-accent" /> Open requests near you</CardTitle></CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <div className="text-3xl font-bold">{openTickets}</div>
              <div className="text-sm text-muted-foreground">tickets currently open</div>
            </div>
            <Button asChild><Link to="/donor/tickets">View tickets</Link></Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
