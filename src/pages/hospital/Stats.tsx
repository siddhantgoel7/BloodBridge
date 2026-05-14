import { useEffect, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";

const URGENCY_COLORS: Record<string, string> = {
  low: "hsl(var(--success))",
  medium: "hsl(var(--primary))",
  high: "hsl(var(--warning))",
  critical: "hsl(var(--accent))",
};

export default function Stats() {
  const { hospital } = useOutletContext<{ hospital: { id: string } }>();
  const [byType, setByType] = useState<{ blood_type: string; tickets: number }[]>([]);
  const [byUrgency, setByUrgency] = useState<{ name: string; value: number }[]>([]);

  useEffect(() => {
    if (!hospital) return;
    (async () => {
      const { data: tickets } = await supabase
        .from("blood_tickets")
        .select("blood_type, urgency")
        .eq("hospital_id", hospital.id);
      const tByType: Record<string, number> = {};
      const tByUrg: Record<string, number> = {};
      (tickets ?? []).forEach((t) => {
        tByType[t.blood_type] = (tByType[t.blood_type] ?? 0) + 1;
        tByUrg[t.urgency] = (tByUrg[t.urgency] ?? 0) + 1;
      });
      setByType(Object.entries(tByType).map(([blood_type, tickets]) => ({ blood_type, tickets })));
      setByUrgency(Object.entries(tByUrg).map(([name, value]) => ({ name, value })));
    })();
  }, [hospital?.id]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Stats</h1>
        <p className="text-sm text-muted-foreground">Aggregate ticket activity for your hospital.</p>
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Tickets by blood type</CardTitle></CardHeader>
          <CardContent>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={byType}>
                  <XAxis dataKey="blood_type" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} allowDecimals={false} />
                  <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
                  <Bar dataKey="tickets" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Tickets by urgency</CardTitle></CardHeader>
          <CardContent>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={byUrgency} dataKey="value" nameKey="name" innerRadius={50} outerRadius={90} paddingAngle={3}>
                    {byUrgency.map((entry) => <Cell key={entry.name} fill={URGENCY_COLORS[entry.name] || "hsl(var(--muted))"} />)}
                  </Pie>
                  <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
