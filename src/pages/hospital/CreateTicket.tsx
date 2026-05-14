import { useState } from "react";
import { useNavigate, useOutletContext } from "react-router-dom";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BLOOD_TYPES, urgencyLabel } from "@/lib/blood";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

const schema = z.object({
  blood_type: z.enum(BLOOD_TYPES as [string, ...string[]]),
  units_needed: z.coerce.number().int().min(1).max(50),
  urgency: z.enum(["low", "medium", "high", "critical"]),
  patient_context: z.string().trim().max(500).optional(),
  search_radius_km: z.coerce.number().int().min(1).max(100),
});

type Hospital = { id: string; name: string };

export default function CreateTicket() {
  const { hospital } = useOutletContext<{ hospital: Hospital }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);

  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: { blood_type: "O+", units_needed: 1, urgency: "medium", search_radius_km: 10, patient_context: "" },
  });

  const onSubmit = async (values: z.infer<typeof schema>) => {
    if (!user || !hospital) return;
    setSubmitting(true);

    // Use hospital lat/lng as ticket location
    const { data: hData } = await supabase.from("hospitals").select("latitude, longitude").eq("id", hospital.id).single();
    if (!hData) { setSubmitting(false); toast.error("Hospital not found"); return; }

    const { data: ticket, error } = await supabase
      .from("blood_tickets")
      .insert({
        hospital_id: hospital.id,
        created_by: user.id,
        blood_type: values.blood_type as any,
        units_needed: values.units_needed,
        urgency: values.urgency as any,
        patient_context: values.patient_context || null,
        search_radius_km: values.search_radius_km,
        latitude: hData.latitude,
        longitude: hData.longitude,
      })
      .select("id")
      .single();

    if (error || !ticket) {
      setSubmitting(false);
      toast.error(error?.message ?? "Failed to create ticket");
      return;
    }

    // Trigger matching engine
    const { data: matchData, error: matchErr } = await supabase.functions.invoke("match-donors", {
      body: { ticket_id: ticket.id },
    });
    setSubmitting(false);

    if (matchErr) {
      toast.warning("Ticket created, but matching engine returned an error");
    } else {
      toast.success(`Ticket created — notified ${matchData?.matched ?? 0} compatible donors`);
    }
    navigate(`/hospital/tickets/${ticket.id}`);
  };

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-6 text-2xl font-bold">New blood ticket</h1>
      <Card>
        <CardHeader>
          <CardTitle>Request details</CardTitle>
          <CardDescription>The matching engine will find nearby compatible donors and notify them in real time.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Blood type needed</Label>
                <Select defaultValue="O+" onValueChange={(v) => form.setValue("blood_type", v as any)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{BLOOD_TYPES.map((b) => <SelectItem key={b} value={b}>{b}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Units needed</Label>
                <Input type="number" min={1} max={50} {...form.register("units_needed")} />
              </div>
              <div className="space-y-2">
                <Label>Urgency</Label>
                <Select defaultValue="medium" onValueChange={(v) => form.setValue("urgency", v as any)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {(["low", "medium", "high", "critical"] as const).map((u) => (
                      <SelectItem key={u} value={u}>{urgencyLabel[u]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Search radius (km)</Label>
                <Input type="number" min={1} max={100} {...form.register("search_radius_km")} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Patient context (optional)</Label>
              <Textarea rows={3} placeholder="Any context for donors (kept private)" {...form.register("patient_context")} />
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="ghost" onClick={() => navigate(-1)}>Cancel</Button>
              <Button type="submit" disabled={submitting}>
                {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Create & match
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
