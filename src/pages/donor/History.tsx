import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";

interface Donation {
  id: string; blood_type: string; units: number; points_awarded: number; donated_at: string;
  hospital: { name: string } | null;
}

export default function History() {
  const { user } = useAuth();
  const [items, setItems] = useState<Donation[]>([]);

  useEffect(() => {
    if (!user) return;
    supabase.from("donations")
      .select("id, blood_type, units, points_awarded, donated_at, hospital:hospitals(name)")
      .eq("donor_id", user.id)
      .order("donated_at", { ascending: false })
      .then(({ data }) => setItems((data ?? []) as any));
  }, [user?.id]);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Donation history</h1>
        <p className="text-sm text-muted-foreground">Your verified donations and points earned.</p>
      </div>

      {items.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground">No donations yet. Your verified donations will appear here.</CardContent></Card>
      ) : (
        items.map((d) => (
          <Card key={d.id}>
            <CardContent className="flex items-center gap-4 p-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-md bg-accent-soft font-bold text-accent">{d.blood_type}</div>
              <div className="flex-1">
                <div className="font-medium">{d.hospital?.name ?? "Hospital"}</div>
                <div className="text-xs text-muted-foreground">{format(new Date(d.donated_at), "PPP")} · {d.units} unit{d.units > 1 ? "s" : ""}</div>
              </div>
              <Badge variant="outline" className="bg-primary-soft text-primary">+{d.points_awarded} pts</Badge>
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
}
