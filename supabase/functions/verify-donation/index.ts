// Verifies a donor's donation: scans check-in code, atomically awards points,
// sets cooldown, increments hospital inventory, and updates ticket fulfillment.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import webpush from "https://esm.sh/web-push@3.6.7";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const VAPID_PUBLIC_KEY = Deno.env.get("VAPID_PUBLIC_KEY");
const VAPID_PRIVATE_KEY = Deno.env.get("VAPID_PRIVATE_KEY");

if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(
    "mailto:support@bloodbridge.com",
    VAPID_PUBLIC_KEY,
    VAPID_PRIVATE_KEY
  );
}

const COOLDOWN_DAYS = 56;
const POINTS = 100;

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
      console.error("VAPID keys are missing from environment variables");
    }
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return new Response(JSON.stringify({ error: "Missing auth" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

    const userClient = createClient(SUPABASE_URL, ANON_KEY, { global: { headers: { Authorization: authHeader } } });
    const { data: u, error: uErr } = await userClient.auth.getUser();
    if (uErr || !u.user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const { response_id, ticket_id } = await req.json();
    if (!response_id || !ticket_id) {
      return new Response(JSON.stringify({ error: "response_id and ticket_id required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const admin = createClient(SUPABASE_URL, SERVICE_KEY);

    const { data: ticket } = await admin.from("blood_tickets").select("*, hospitals(name)").eq("id", ticket_id).maybeSingle();
    if (!ticket) return new Response(JSON.stringify({ error: "Ticket not found" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    // Authz: caller must be staff of the hospital
    const { data: staff } = await admin.from("hospital_staff").select("id").eq("user_id", u.user.id).eq("hospital_id", ticket.hospital_id).maybeSingle();
    if (!staff) return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const { data: resp } = await admin.from("ticket_responses").select("*").eq("id", response_id).maybeSingle();
    if (!resp) return new Response(JSON.stringify({ error: "Response not found" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    if (resp.status === "donated") return new Response(JSON.stringify({ error: "Already verified" }), { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const now = new Date();
    const cooldownUntil = new Date(now.getTime() + COOLDOWN_DAYS * 86400000).toISOString();

    // 1) Mark response as donated
    await admin.from("ticket_responses").update({
      status: "donated",
      donated_at: now.toISOString(),
      checked_in_at: resp.checked_in_at ?? now.toISOString(),
    }).eq("id", response_id);

    // 2) Insert donation record
    await admin.from("donations").insert({
      donor_id: resp.donor_id,
      hospital_id: ticket.hospital_id,
      ticket_id,
      blood_type: ticket.blood_type,
      units: 1,
      points_awarded: POINTS,
      verified_by: u.user.id,
      donated_at: now.toISOString(),
    });

    // 3) Update donor profile (points, cooldown, last donation, totals)
    const { data: donorProfile } = await admin.from("profiles").select("points, total_donations").eq("id", resp.donor_id).maybeSingle();
    await admin.from("profiles").update({
      points: (donorProfile?.points ?? 0) + POINTS,
      total_donations: (donorProfile?.total_donations ?? 0) + 1,
      last_donation_at: now.toISOString(),
      cooldown_until: cooldownUntil,
    }).eq("id", resp.donor_id);

    // 4) Increment inventory
    const { data: inv } = await admin.from("inventory").select("id, units").eq("hospital_id", ticket.hospital_id).eq("blood_type", ticket.blood_type).maybeSingle();
    if (inv) {
      await admin.from("inventory").update({ units: inv.units + 1 }).eq("id", inv.id);
    } else {
      await admin.from("inventory").insert({ hospital_id: ticket.hospital_id, blood_type: ticket.blood_type, units: 1 });
    }

    // 5) Update ticket fulfillment
    const newFulfilled = (ticket.units_fulfilled ?? 0) + 1;
    const newStatus = newFulfilled >= ticket.units_needed ? "fulfilled" : ticket.status;
    await admin.from("blood_tickets").update({
      units_fulfilled: newFulfilled,
      status: newStatus,
    }).eq("id", ticket_id);

    // 6) Send Push Notification to donor
    const { data: subs } = await admin
      .from("push_subscriptions")
      .select("subscription")
      .eq("user_id", resp.donor_id);

    const hospitalName = (ticket.hospitals as any)?.name ?? "the hospital";

    if (subs && subs.length > 0) {
      const notifications = subs.map((sub: any) => {
        return webpush.sendNotification(
          sub.subscription,
          JSON.stringify({
            title: "❤️ Donation Verified!",
            body: `Thank you for donating at ${hospitalName}! You've earned ${POINTS} points.`,
            icon: "/pwa-192x192.png",
            badge: "/pwa-192x192.png",
            data: {
              url: "/donor/history"
            }
          })
        ).catch((e: Error) => console.error("Failed to send thank you note", e));
      });
      await Promise.all(notifications);
    }

    return new Response(JSON.stringify({ success: true, points_awarded: POINTS, cooldown_until: cooldownUntil }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("verify-donation error", e);
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
