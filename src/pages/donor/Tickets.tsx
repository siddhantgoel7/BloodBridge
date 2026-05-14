import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BloodType, canDonateTo, distanceKm, Urgency, urgencyClasses, urgencyLabel } from "@/lib/blood";
import { formatDistanceToNow } from "date-fns";
import { MapPin } from "lucide-react";

interface Ticket {
  id: string; blood_type: BloodType; units_needed: number; units_fulfilled: number;
  urgency: Urgency; status: string; created_at: string; latitude: number; longitude: number;
  search_radius_km: number;
  hospital: { name: string; city: string | null } | null;
}

export default function Tickets() {
  const { user } = useAuth();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [me, setMe] = useState<{ blood_type: BloodType | null; latitude: number | null; longitude: number | null } | null>(null);

  const load = async () => {
    if (!user) return;
    const { data: prof } = await supabase.from("profiles").select("blood_type, latitude, longitude").eq("id", user.id).maybeSingle();
    setMe(prof as any);
    const { data } = await supabase
      .from("blood_tickets")
      .select("id, blood_type, units_needed, units_fulfilled, urgency, status, created_at, latitude, longitude, search_radius_km, hospital:hospitals(name, city)")
      .in("status", ["open", "in_progress"])
      .order("created_at", { ascending: false });
    setTickets((data ?? []) as any);
  };

  useEffect(() => {
    load();
    const ch = supabase.channel("donor-open-tickets")
      .on("postgres_changes", { event: "*", schema: "public", table: "blood_tickets" }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user?.id]);

  const visible = tickets.filter((t) => {
    if (!me?.blood_type) return true;
    if (!canDonateTo(me.blood_type, t.blood_type)) return false;
    if (me.latitude && me.longitude) {
      const d = distanceKm(me.latitude, me.longitude, t.latitude, t.longitude);
      if (d > t.search_radius_km) return false;
    }
    return true;
  });

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Compatible tickets</h1>
        <p className="text-sm text-muted-foreground">Requests near you that match your blood type.</p>
      </div>

      {visible.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground">No matching requests right now.</CardContent></Card>
      ) : (
        visible.map((t) => {
          const d = me?.latitude && me?.longitude ? distanceKm(me.latitude, me.longitude, t.latitude, t.longitude) : null;
          return (
            <Link key={t.id} to={`/donor/tickets/${t.id}`}>
              <Card className="transition-shadow hover:shadow-elevated">
                <CardContent className="flex items-center gap-4 p-4">
                  <div className="flex h-14 w-14 items-center justify-center rounded-lg bg-accent-soft text-lg font-bold text-accent">
                    {t.blood_type}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold truncate">{t.hospital?.name ?? "Hospital"}</span>
                      <Badge variant="outline" className={urgencyClasses[t.urgency]}>{urgencyLabel[t.urgency]}</Badge>
                    </div>
                    <div className="mt-1 text-xs text-muted-foreground flex items-center gap-2">
                      <span>{t.units_fulfilled}/{t.units_needed} units</span>
                      {d !== null && <><span>·</span><MapPin className="h-3 w-3" /><span>{d.toFixed(1)} km</span></>}
                      <span>·</span><span>{formatDistanceToNow(new Date(t.created_at))} ago</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          );
        })
      )}
    </div>
  );
}
