import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, CheckCircle2, Loader2, ShieldCheck, Users } from "lucide-react";
import { Urgency, urgencyClasses, urgencyLabel } from "@/lib/blood";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";

interface Ticket {
  id: string; blood_type: string; units_needed: number; units_fulfilled: number;
  urgency: Urgency; status: string; patient_context: string | null;
  search_radius_km: number; created_at: string; expires_at: string;
}
interface Response {
  id: string; donor_id: string; status: string; check_in_code: string;
  responded_at: string; checked_in_at: string | null; donated_at: string | null;
  donor: { full_name: string; blood_type: string | null; phone: string | null } | null;
}

export default function TicketDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [responses, setResponses] = useState<Response[]>([]);
  const [verifyCode, setVerifyCode] = useState("");
  const [verifying, setVerifying] = useState<string | null>(null);

  const load = async () => {
    if (!id) return;
    const { data: t } = await supabase.from("blood_tickets").select("*").eq("id", id).maybeSingle();
    setTicket(t as Ticket | null);
    const { data: r } = await supabase
      .from("ticket_responses")
      .select("*, donor:profiles!ticket_responses_donor_id_fkey(full_name, blood_type, phone)")
      .eq("ticket_id", id)
      .order("responded_at", { ascending: false });
    setResponses((r ?? []) as any);
  };

  const playPing = () => {
    const audio = new Audio("https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3");
    audio.volume = 0.5;
    audio.play().catch(() => {});
    if (navigator.vibrate) navigator.vibrate(200);
  };

  useEffect(() => {
    load();
    if (!id) return;
    const ch = supabase.channel(`ticket-${id}`)
      .on("postgres_changes", { 
        event: "INSERT", 
        schema: "public", 
        table: "ticket_responses", 
        filter: `ticket_id=eq.${id}` 
      }, () => {
        load();
        playPing();
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "ticket_responses", filter: `ticket_id=eq.${id}` }, () => load())
      .on("postgres_changes", { event: "*", schema: "public", table: "blood_tickets", filter: `id=eq.${id}` }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [id]);

  const verifyByCode = async () => {
    if (!verifyCode) return;
    const code = verifyCode.trim().toLowerCase();
    
    // First try current ticket responses
    let match = responses.find((r) => r.check_in_code.toLowerCase() === code);
    
    // If not found, search all tickets for this hospital
    if (!match && ticket) {
      const { data: globalMatch } = await supabase
        .from("ticket_responses")
        .select("*, ticket:blood_tickets(id, hospital_id)")
        .ilike("check_in_code", code) // Case-insensitive search
        .maybeSingle();

      if (globalMatch && (globalMatch.ticket as any)?.hospital_id === ticket.hospital_id) {
        match = globalMatch as any;
      }
    }

    if (!match) {
      toast.error("No matching check-in code found for this hospital");
      return;
    }

    // Pass the correct ticket_id if it was found globally
    const targetTicketId = (match as any).ticket_id || ticket.id;
    await verify(match.id, targetTicketId);
    setVerifyCode("");
  };

  const verify = async (responseId: string, targetTicketId?: string) => {
    if (!ticket) return;
    const finalTicketId = targetTicketId || ticket.id;
    setVerifying(responseId);
    const { data, error } = await supabase.functions.invoke("verify-donation", {
      body: { response_id: responseId, ticket_id: finalTicketId },
    });
    setVerifying(null);
    if (error || data?.error) { toast.error(error?.message || data?.error); return; }
    toast.success(`Donation verified — ${data.points_awarded} points awarded`);
    load();
  };

  const cancelTicket = async () => {
    if (!ticket) return;
    const { error } = await supabase.from("blood_tickets").update({ status: "cancelled" }).eq("id", ticket.id);
    if (error) { toast.error(error.message); return; }
    toast.success("Ticket cancelled");
    load();
  };

  if (!ticket) return <div className="flex h-64 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;

  const accepted = responses.filter((r) => r.status === "accepted" || r.status === "checked_in").length;
  const donated = responses.filter((r) => r.status === "donated").length;

  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm" onClick={() => navigate("/hospital")}>
        <ArrowLeft className="mr-2 h-4 w-4" /> Back
      </Button>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-lg bg-accent-soft text-2xl font-bold text-accent">
            {ticket.blood_type}
          </div>
          <div>
            <h1 className="text-2xl font-bold">{ticket.units_fulfilled}/{ticket.units_needed} units</h1>
            <div className="mt-1 flex flex-wrap gap-2">
              <Badge variant="outline" className={urgencyClasses[ticket.urgency]}>{urgencyLabel[ticket.urgency]}</Badge>
              <Badge variant="secondary">{ticket.status}</Badge>
              <Badge variant="outline">{ticket.search_radius_km} km radius</Badge>
            </div>
          </div>
        </div>
        {ticket.status !== "fulfilled" && ticket.status !== "cancelled" && (
          <Button variant="outline" onClick={cancelTicket}>Cancel ticket</Button>
        )}
      </div>

      {ticket.patient_context && (
        <Card><CardContent className="p-4 text-sm text-muted-foreground">{ticket.patient_context}</CardContent></Card>
      )}

      <div className="grid gap-4 sm:grid-cols-3">
        <StatBox label="Total responses" value={responses.length} icon={Users} />
        <StatBox label="Awaiting check-in" value={accepted} icon={Loader2} />
        <StatBox label="Donations completed" value={donated} icon={CheckCircle2} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><ShieldCheck className="h-5 w-5" /> Verify donation</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-2 sm:flex-row">
            <div className="flex-1 space-y-1">
              <Label>Donor check-in code</Label>
              <Input placeholder="e.g. a1b2c3d4" value={verifyCode} onChange={(e) => setVerifyCode(e.target.value)} />
            </div>
            <Button onClick={verifyByCode} className="self-end">Verify</Button>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">In a real deployment, scan the donor's QR. The code is shown in the donor's app.</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Live donor responses</CardTitle></CardHeader>
        <CardContent>
          {responses.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">Waiting for donors to respond…</div>
          ) : (
            <div className="divide-y divide-border">
              {responses.map((r) => (
                <div key={r.id} className="flex items-center justify-between gap-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-soft text-sm font-semibold text-primary">
                      {r.donor?.blood_type ?? "—"}
                    </div>
                    <div>
                      <div className="font-medium">{r.donor?.full_name || "Donor"}</div>
                      <div className="text-xs text-muted-foreground">
                        Code: <code className="font-mono">{r.check_in_code}</code> · {formatDistanceToNow(new Date(r.responded_at))} ago
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={r.status === "donated" ? "default" : "outline"}>{r.status}</Badge>
                    {r.status !== "donated" && r.status !== "declined" && (
                      <Button size="sm" variant="outline" disabled={verifying === r.id} onClick={() => verify(r.id)}>
                        {verifying === r.id ? <Loader2 className="h-4 w-4 animate-spin" /> : "Mark donated"}
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function StatBox({ label, value, icon: Icon }: { label: string; value: number; icon: any }) {
  return (
    <Card>
      <CardContent className="flex items-center gap-3 p-4">
        <div className="flex h-10 w-10 items-center justify-center rounded-md bg-muted text-muted-foreground">
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <div className="text-xl font-bold">{value}</div>
          <div className="text-xs text-muted-foreground">{label}</div>
        </div>
      </CardContent>
    </Card>
  );
}
