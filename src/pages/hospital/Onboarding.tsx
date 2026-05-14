import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

interface Hospital { id: string; name: string; city: string | null }

export default function HospitalOnboarding() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [hospitals, setHospitals] = useState<Hospital[]>([]);
  const [selected, setSelected] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    supabase.from("hospitals").select("id, name, city").order("name").then(({ data }) => {
      setHospitals(data ?? []);
    });
    // skip onboarding if already linked
    if (user) {
      supabase.from("hospital_staff").select("id").eq("user_id", user.id).maybeSingle().then(({ data }) => {
        if (data) navigate("/hospital", { replace: true });
      });
    }
  }, [user, navigate]);

  const join = async () => {
    if (!user || !selected) return;
    setSubmitting(true);
    const { error } = await supabase.from("hospital_staff").insert({
      user_id: user.id,
      hospital_id: selected,
      position: "staff",
    });
    setSubmitting(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Linked to hospital");
    navigate("/hospital", { replace: true });
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-soft px-4 py-10">
      <Card className="w-full max-w-md shadow-elevated">
        <CardHeader>
          <CardTitle>Join a hospital</CardTitle>
          <CardDescription>Pick the hospital you'll be managing blood requests for. (Demo: pre-seeded list)</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Hospital</Label>
            <Select value={selected} onValueChange={setSelected}>
              <SelectTrigger><SelectValue placeholder="Select a hospital" /></SelectTrigger>
              <SelectContent>
                {hospitals.map((h) => (
                  <SelectItem key={h.id} value={h.id}>{h.name}{h.city ? ` — ${h.city}` : ""}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button className="w-full" onClick={join} disabled={!selected || submitting}>
            {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Continue
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
