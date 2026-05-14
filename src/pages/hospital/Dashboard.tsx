import { useEffect, useState } from "react";
import { Link, useOutletContext } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PlusCircle, Activity, CheckCircle2, AlertTriangle } from "lucide-react";
import { Urgency, urgencyClasses, urgencyLabel } from "@/lib/blood";
import { formatDistanceToNow } from "date-fns";

interface Ticket {
  id: string; blood_type: string; units_needed: number; units_fulfilled: number;
  urgency: Urgency; status: string; created_at: string;
}

export default function Dashboard() {
  const { hospital } = useOutletContext<{ hospital: { id: string; name: string } }>();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [stats, setStats] = useState({ open: 0, fulfilled: 0, donations: 0 });

  useEffect(() => {
    if (!hospital) return;
    const load = async () => {
      const { data } = await supabase
        .from("blood_tickets")
        .select("id, blood_type, units_needed, units_fulfilled, urgency, status, created_at")
        .eq("hospital_id", hospital.id)
        .order("created_at", { ascending: false })
        .limit(20);
      const all = (data ?? []) as Ticket[];
      setTickets(all);
      setStats({
        open: all.filter((t) => t.status === "open" || t.status === "in_progress").length,
        fulfilled: all.filter((t) => t.status === "fulfilled").length,
        donations: all.reduce((s, t) => s + (t.units_fulfilled ?? 0), 0),
      });
    };
    load();
    const channel = supabase.channel(`tickets-h-${hospital.id}`)
      .on("postgres_changes",
        { event: "*", schema: "public", table: "blood_tickets", filter: `hospital_id=eq.${hospital.id}` },
        () => load())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [hospital]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-sm text-muted-foreground">Live overview of your hospital's blood requests.</p>
        </div>
        <Button asChild><Link to="/hospital/tickets/new"><PlusCircle className="mr-2 h-4 w-4" /> New ticket</Link></Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard icon={Activity} label="Active tickets" value={stats.open} tone="primary" />
        <StatCard icon={CheckCircle2} label="Fulfilled" value={stats.fulfilled} tone="success" />
        <StatCard icon={AlertTriangle} label="Units collected" value={stats.donations} tone="accent" />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent tickets</CardTitle>
        </CardHeader>
        <CardContent>
          {tickets.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">No tickets yet. Create your first one.</div>
          ) : (
            <div className="divide-y divide-border">
              {tickets.map((t) => (
                <Link key={t.id} to={`/hospital/tickets/${t.id}`} className="flex items-center justify-between gap-4 py-4 transition-colors hover:bg-muted/40 -mx-2 px-2 rounded-md">
                  <div className="flex items-center gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-md bg-accent-soft font-bold text-accent">
                      {t.blood_type}
                    </div>
                    <div>
                      <div className="font-medium">{t.units_fulfilled}/{t.units_needed} units</div>
                      <div className="text-xs text-muted-foreground">{formatDistanceToNow(new Date(t.created_at))} ago</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className={urgencyClasses[t.urgency]}>{urgencyLabel[t.urgency]}</Badge>
                    <Badge variant="secondary">{t.status}</Badge>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, tone }: { icon: any; label: string; value: number; tone: "primary" | "success" | "accent" }) {
  const toneClass = tone === "primary" ? "bg-primary-soft text-primary" : tone === "success" ? "bg-success/10 text-success" : "bg-accent-soft text-accent";
  return (
    <Card>
      <CardContent className="flex items-center gap-4 p-6">
        <div className={`flex h-12 w-12 items-center justify-center rounded-md ${toneClass}`}>
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <div className="text-2xl font-bold">{value}</div>
          <div className="text-sm text-muted-foreground">{label}</div>
        </div>
      </CardContent>
    </Card>
  );
}
