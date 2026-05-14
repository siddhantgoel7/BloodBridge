import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BLOOD_TYPES } from "@/lib/blood";
import { toast } from "sonner";
import { Loader2, MapPin } from "lucide-react";

const schema = z.object({
  blood_type: z.enum(BLOOD_TYPES as [string, ...string[]]),
  date_of_birth: z.string().min(1),
  phone: z.string().trim().min(7).max(20).optional().or(z.literal("")),
});

export default function DonorOnboarding() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);

  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: { blood_type: "O+", date_of_birth: "", phone: "" },
  });

  const useMyLocation = () => {
    if (!navigator.geolocation) { toast.error("Geolocation unavailable"); return; }
    navigator.geolocation.getCurrentPosition(
      (pos) => { setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude }); toast.success("Location captured"); },
      () => {
        // Fallback: SF downtown for demo
        setCoords({ lat: 37.7749, lng: -122.4194 });
        toast.message("Using demo location (SF)");
      }
    );
  };

  const onSubmit = async (v: z.infer<typeof schema>) => {
    if (!user) return;
    setSubmitting(true);
    const { error } = await supabase.from("profiles").update({
      blood_type: v.blood_type as any,
      date_of_birth: v.date_of_birth,
      phone: v.phone || null,
      latitude: coords?.lat ?? 37.7749,
      longitude: coords?.lng ?? -122.4194,
      onboarded: true,
    }).eq("id", user.id);
    setSubmitting(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Welcome to BloodLink!");
    navigate("/donor", { replace: true });
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-soft px-4 py-10">
      <Card className="w-full max-w-md shadow-elevated">
        <CardHeader>
          <CardTitle>Tell us about you</CardTitle>
          <CardDescription>This helps us match you with nearby compatible requests.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label>Blood type</Label>
              <Select defaultValue="O+" onValueChange={(v) => form.setValue("blood_type", v as any)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{BLOOD_TYPES.map((b) => <SelectItem key={b} value={b}>{b}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Date of birth</Label>
              <Input type="date" {...form.register("date_of_birth")} />
            </div>
            <div className="space-y-2">
              <Label>Phone (optional)</Label>
              <Input type="tel" placeholder="+1 555 555 5555" {...form.register("phone")} />
            </div>
            <div className="space-y-2">
              <Label>Location</Label>
              <Button type="button" variant="outline" className="w-full" onClick={useMyLocation}>
                <MapPin className="mr-2 h-4 w-4" />
                {coords ? `Captured (${coords.lat.toFixed(3)}, ${coords.lng.toFixed(3)})` : "Use my location"}
              </Button>
              <p className="text-xs text-muted-foreground">Used only for distance-based matching. Falls back to a demo location if denied.</p>
            </div>
            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Finish setup
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
