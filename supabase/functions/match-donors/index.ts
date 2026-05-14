// Matches an open blood ticket to nearby compatible available donors.
// Called by hospital staff after creating a ticket. Mocks notification dispatch.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const COMPAT: Record<string, string[]> = {
  "O-":  ["O-"],
  "O+":  ["O-","O+"],
  "A-":  ["O-","A-"],
  "A+":  ["O-","O+","A-","A+"],
  "B-":  ["O-","B-"],
  "B+":  ["O-","O+","B-","B+"],
  "AB-": ["O-","A-","B-","AB-"],
  "AB+": ["O-","O+","A-","A+","B-","B+","AB-","AB+"],
};

function distanceKm(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing auth" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Verify caller
    const userClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const ticketId: string | undefined = body?.ticket_id;
    if (!ticketId) {
      return new Response(JSON.stringify({ error: "ticket_id required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Service-role client for cross-table reads
    const admin = createClient(SUPABASE_URL, SERVICE_KEY);

    const { data: ticket, error: tErr } = await admin
      .from("blood_tickets").select("*").eq("id", ticketId).maybeSingle();
    if (tErr || !ticket) {
      return new Response(JSON.stringify({ error: "Ticket not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify caller is staff at the ticket's hospital
    const { data: staff } = await admin
      .from("hospital_staff")
      .select("id")
      .eq("user_id", userData.user.id)
      .eq("hospital_id", ticket.hospital_id)
      .maybeSingle();
    if (!staff) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const compatibleTypes = COMPAT[ticket.blood_type] ?? [];
    const nowIso = new Date().toISOString();

    // Pull all available, eligible donors with location
    const { data: donors } = await admin
      .from("profiles")
      .select("id, full_name, blood_type, latitude, longitude, is_available, cooldown_until, phone")
      .in("blood_type", compatibleTypes)
      .eq("is_available", true)
      .eq("onboarded", true)
      .not("latitude", "is", null)
      .not("longitude", "is", null);

    const matches = (donors ?? [])
      .filter((d) => !d.cooldown_until || d.cooldown_until < nowIso)
      .map((d) => ({
        ...d,
        distance_km: distanceKm(ticket.latitude, ticket.longitude, d.latitude!, d.longitude!),
      }))
      .filter((d) => d.distance_km <= ticket.search_radius_km)
      .sort((a, b) => a.distance_km - b.distance_km);

    // Mock notification dispatch (push + SMS would happen here)
    for (const m of matches) {
      console.log(`[notify] ticket=${ticketId} donor=${m.id} (${m.blood_type}) dist=${m.distance_km.toFixed(2)}km — would push + SMS to ${m.phone ?? "n/a"}`);
    }

    // Mark ticket in_progress
    await admin
      .from("blood_tickets")
      .update({ status: "in_progress" })
      .eq("id", ticketId)
      .eq("status", "open");

    return new Response(
      JSON.stringify({ matched: matches.length, donors: matches.slice(0, 50) }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("match-donors error", e);
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
