import { useEffect, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { BLOOD_TYPES } from "@/lib/blood";
import { toast } from "sonner";

interface Inv { id: string; blood_type: string; units: number }

export default function Inventory() {
  const { hospital } = useOutletContext<{ hospital: { id: string } }>();
  const [items, setItems] = useState<Inv[]>([]);
  const [edits, setEdits] = useState<Record<string, number>>({});

  const load = async () => {
    if (!hospital) return;
    const { data } = await supabase.from("inventory").select("id, blood_type, units").eq("hospital_id", hospital.id);
    const sorted = [...(data ?? [])].sort((a, b) => BLOOD_TYPES.indexOf(a.blood_type as any) - BLOOD_TYPES.indexOf(b.blood_type as any));
    setItems(sorted);
  };

  useEffect(() => { load(); }, [hospital?.id]);

  const save = async (it: Inv) => {
    const newUnits = edits[it.id] ?? it.units;
    const { error } = await supabase.from("inventory").update({ units: newUnits }).eq("id", it.id);
    if (error) { toast.error(error.message); return; }
    toast.success(`${it.blood_type} updated`);
    load();
  };

  const lowStock = (u: number) => u < 5;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Inventory</h1>
        <p className="text-sm text-muted-foreground">Current units on hand by blood type.</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {items.map((it) => (
          <Card key={it.id} className={lowStock(it.units) ? "border-accent/40" : ""}>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center justify-between">
                <span>{it.blood_type}</span>
                {lowStock(it.units) && <span className="text-xs font-medium text-accent">Low</span>}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="text-3xl font-bold">{edits[it.id] ?? it.units}<span className="ml-1 text-sm font-normal text-muted-foreground">units</span></div>
              <div className="flex gap-2">
                <Input
                  type="number"
                  min={0}
                  defaultValue={it.units}
                  onChange={(e) => setEdits((p) => ({ ...p, [it.id]: parseInt(e.target.value || "0", 10) }))}
                />
                <Button size="sm" onClick={() => save(it)}>Save</Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
