import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, CheckCircle2, Loader2, QrCode } from "lucide-react";
import { Urgency, urgencyClasses, urgencyLabel } from "@/lib/blood";
import { toast } from "sonner";

interface Ticket {
  id: string; blood_type: string; units_needed: number; units_fulfilled: number;
  urgency: Urgency; status: string; patient_context: string | null;
  hospital: { name: string; address: string; city: string | null } | null;
}
interface MyResponse { id: string; status: string; check_in_code: string }

export default function DonorTicketDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [myResp, setMyResp] = useState<MyResponse | null>(null);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    if (!id || !user) return;
    const { data: t } = await supabase.from("blood_tickets")
      .select("*, hospital:hospitals(name, address, city)").eq("id", id).maybeSingle();
    setTicket(t as any);
    const { data: r } = await supabase.from("ticket_responses")
      .select("id, status, check_in_code").eq("ticket_id", id).eq("donor_id", user.id).maybeSingle();
    setMyResp(r as MyResponse | null);
  };

  useEffect(() => {
    load();
    if (!id) return;
    const ch = supabase.channel(`d-ticket-${id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "blood_tickets", filter: `id=eq.${id}` }, () => load())
      .on("postgres_changes", { event: "*", schema: "public", table: "ticket_responses", filter: `ticket_id=eq.${id}` }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [id, user?.id]);

  const respond = async (status: "accepted" | "declined") => {
    if (!user || !ticket) return;
    setBusy(true);
    const { error } = await supabase.from("ticket_responses").upsert(
      { ticket_id: ticket.id, donor_id: user.id, status },
      { onConflict: "ticket_id,donor_id" }
    );
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    toast.success(status === "accepted" ? "Thanks — the hospital has been notified" : "Response recorded");
    load();
  };

  const checkIn = async () => {
    if (!myResp) return;
    const { error } = await supabase.from("ticket_responses")
      .update({ status: "checked_in", checked_in_at: new Date().toISOString() })
      .eq("id", myResp.id);
    if (error) { toast.error(error.message); return; }
    toast.success("Checked in — show the code to staff");
    load();
  };

  if (!ticket) return <div className="flex h-64 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-5">
      <Button variant="ghost" size="sm" onClick={() => navigate("/donor/tickets")}>
        <ArrowLeft className="mr-2 h-4 w-4" /> Back
      </Button>

      <Card>
        <CardContent className="p-6">
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-lg bg-accent-soft text-2xl font-bold text-accent pulse-ring">
              {ticket.blood_type}
            </div>
            <div className="flex-1">
              <h1 className="text-xl font-bold">{ticket.hospital?.name}</h1>
              <p className="text-sm text-muted-foreground">{ticket.hospital?.address}{ticket.hospital?.city ? `, ${ticket.hospital.city}` : ""}</p>
              <div className="mt-2 flex flex-wrap gap-2">
                <Badge variant="outline" className={urgencyClasses[ticket.urgency]}>{urgencyLabel[ticket.urgency]}</Badge>
                <Badge variant="secondary">{ticket.units_fulfilled}/{ticket.units_needed} units</Badge>
              </div>
            </div>
          </div>
          {ticket.patient_context && (
            <p className="mt-4 text-sm text-muted-foreground">{ticket.patient_context}</p>
          )}
        </CardContent>
      </Card>

      {!myResp || myResp.status === "declined" ? (
        <div className="grid grid-cols-2 gap-3">
          <Button variant="outline" disabled={busy} onClick={() => respond("declined")}>Decline</Button>
          <Button disabled={busy} onClick={() => respond("accepted")}>
            {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Accept
          </Button>
        </div>
      ) : myResp.status === "donated" ? (
        <Card className="border-success/30 bg-success/5">
          <CardContent className="flex items-center gap-3 p-4">
            <CheckCircle2 className="h-6 w-6 text-success" />
            <div>
              <div className="font-semibold">Donation verified — thank you!</div>
              <div className="text-sm text-muted-foreground">Your points have been credited.</div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><QrCode className="h-5 w-5" /> Your check-in code</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-lg border-2 border-dashed border-primary/30 bg-primary-soft py-8 text-center">
              <div className="font-mono text-3xl font-bold tracking-widest text-primary">{myResp.check_in_code}</div>
              <p className="mt-2 text-xs text-muted-foreground">Show this code to hospital staff on arrival.</p>
            </div>
            <div className="text-sm">
              <div>Status: <Badge variant="outline">{myResp.status}</Badge></div>
            </div>
            {myResp.status === "accepted" && (
              <Button className="w-full" onClick={checkIn}>I've arrived — check me in</Button>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
