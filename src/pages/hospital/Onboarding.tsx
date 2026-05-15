import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Building2, ExternalLink, Loader2, MapPin, Plus, Search, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface Hospital { id: string; name: string; city: string | null }
interface NominatimResult {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
  address: {
    road?: string;
    house_number?: string;
    city?: string;
    town?: string;
    state?: string;
    country?: string;
  };
}

type Mode = "join" | "register";

export default function HospitalOnboarding() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState<Mode>("join");

  // Join existing
  const [hospitals, setHospitals] = useState<Hospital[]>([]);
  const [selected, setSelected] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);

  // Register new
  const [hospName, setHospName] = useState("");
  const [addressQuery, setAddressQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [addressResults, setAddressResults] = useState<NominatimResult[]>([]);
  const [chosenAddress, setChosenAddress] = useState<NominatimResult | null>(null);
  const [registering, setRegistering] = useState(false);
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    supabase.from("hospitals").select("id, name, city").order("name").then(({ data }) => {
      setHospitals(data ?? []);
    });
    if (user) {
      supabase.from("hospital_staff").select("id").eq("user_id", user.id).maybeSingle().then(({ data }) => {
        if (data) navigate("/hospital", { replace: true });
      });
    }
  }, [user, navigate]);

  // Debounced address search via Nominatim
  const onAddressInput = (val: string) => {
    setAddressQuery(val);
    setChosenAddress(null);
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    if (val.trim().length < 3) { setAddressResults([]); return; }
    searchTimeout.current = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(val)}&format=json&addressdetails=1&limit=5`,
          { headers: { "Accept-Language": "en" } }
        );
        const data: NominatimResult[] = await res.json();
        setAddressResults(data);
      } catch {
        toast.error("Address search failed");
      } finally {
        setSearching(false);
      }
    }, 500);
  };

  const selectAddress = (result: NominatimResult) => {
    setChosenAddress(result);
    setAddressQuery(result.display_name);
    setAddressResults([]);
  };

  const openInMaps = () => {
    if (!chosenAddress) return;
    window.open(
      `https://www.openstreetmap.org/?mlat=${chosenAddress.lat}&mlon=${chosenAddress.lon}#map=17/${chosenAddress.lat}/${chosenAddress.lon}`,
      "_blank"
    );
  };

  const join = async () => {
    if (!user || !selected) return;
    setSubmitting(true);
    const { error } = await supabase.from("hospital_staff").insert({
      user_id: user.id,
      hospital_id: selected,
      position: "staff",
    });
    setSubmitting(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Linked to hospital");
    navigate("/hospital", { replace: true });
  };

  const register = async () => {
    if (!user || !hospName.trim() || !chosenAddress) return;
    setRegistering(true);

    const addr = chosenAddress.address;
    const streetAddress = [addr.house_number, addr.road].filter(Boolean).join(" ") || chosenAddress.display_name.split(",")[0];
    const city = addr.city || addr.town || addr.state || "";

    // 1) Create the hospital
    const { data: newHosp, error: hospErr } = await supabase
      .from("hospitals")
      .insert({
        name: hospName.trim(),
        address: streetAddress,
        city,
        latitude: parseFloat(chosenAddress.lat),
        longitude: parseFloat(chosenAddress.lon),
      })
      .select("id")
      .single();

    if (hospErr || !newHosp) {
      toast.error(hospErr?.message ?? "Failed to create hospital");
      setRegistering(false);
      return;
    }

    // 2) Link staff to the new hospital
    const { error: staffErr } = await supabase.from("hospital_staff").insert({
      user_id: user.id,
      hospital_id: newHosp.id,
      position: "staff",
    });

    setRegistering(false);
    if (staffErr) { toast.error(staffErr.message); return; }
    toast.success(`${hospName} registered and linked!`);
    navigate("/hospital", { replace: true });
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-soft px-4 py-10">
      <Card className="w-full max-w-lg shadow-elevated">
        <CardHeader>
          <CardTitle>Hospital Setup</CardTitle>
          <CardDescription>Join an existing hospital or register a new one.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">

          {/* Mode Toggle */}
          <div className="grid grid-cols-2 gap-2 rounded-lg border border-border bg-muted/30 p-1">
            <button
              onClick={() => setMode("join")}
              className={cn(
                "flex items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-all",
                mode === "join" ? "bg-background shadow-sm text-primary" : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Building2 className="h-4 w-4" /> Join Existing
            </button>
            <button
              onClick={() => setMode("register")}
              className={cn(
                "flex items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-all",
                mode === "register" ? "bg-background shadow-sm text-primary" : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Plus className="h-4 w-4" /> Register New
            </button>
          </div>

          {/* JOIN MODE */}
          {mode === "join" && (
            <div className="space-y-4 animate-in fade-in-0 slide-in-from-left-2">
              <div className="space-y-2">
                <Label>Select your hospital</Label>
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
            </div>
          )}

          {/* REGISTER MODE */}
          {mode === "register" && (
            <div className="space-y-4 animate-in fade-in-0 slide-in-from-right-2">

              {/* Hospital Name */}
              <div className="space-y-2">
                <Label>Hospital name</Label>
                <Input
                  placeholder="e.g. City General Hospital"
                  value={hospName}
                  onChange={(e) => setHospName(e.target.value)}
                />
              </div>

              {/* Address Search */}
              <div className="space-y-2">
                <Label>Hospital address</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    className="pl-9 pr-9"
                    placeholder="Search address or place name…"
                    value={addressQuery}
                    onChange={(e) => onAddressInput(e.target.value)}
                  />
                  {addressQuery && (
                    <button
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      onClick={() => { setAddressQuery(""); setAddressResults([]); setChosenAddress(null); }}
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>

                {/* Results Dropdown */}
                {(searching || addressResults.length > 0) && !chosenAddress && (
                  <div className="rounded-lg border border-border bg-background shadow-lg overflow-hidden">
                    {searching && (
                      <div className="flex items-center gap-2 p-3 text-sm text-muted-foreground">
                        <Loader2 className="h-4 w-4 animate-spin" /> Searching…
                      </div>
                    )}
                    {addressResults.map((r) => (
                      <button
                        key={r.place_id}
                        onClick={() => selectAddress(r)}
                        className="flex w-full items-start gap-2 p-3 text-left text-sm hover:bg-muted transition-colors border-b border-border last:border-0"
                      >
                        <MapPin className="h-4 w-4 mt-0.5 shrink-0 text-primary" />
                        <span className="line-clamp-2">{r.display_name}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Map Preview */}
              {chosenAddress && (
                <div className="space-y-2 animate-in fade-in-0 zoom-in-95">
                  <div className="relative overflow-hidden rounded-lg border border-border">
                    <iframe
                      title="Location preview"
                      className="h-48 w-full"
                      src={`https://www.openstreetmap.org/export/embed.html?bbox=${parseFloat(chosenAddress.lon) - 0.005},${parseFloat(chosenAddress.lat) - 0.005},${parseFloat(chosenAddress.lon) + 0.005},${parseFloat(chosenAddress.lat) + 0.005}&layer=mapnik&marker=${chosenAddress.lat},${chosenAddress.lon}`}
                    />
                    <button
                      onClick={openInMaps}
                      className="absolute bottom-2 right-2 flex items-center gap-1 rounded-md bg-background/90 px-2 py-1 text-xs font-medium shadow hover:bg-background transition-colors"
                    >
                      <ExternalLink className="h-3 w-3" /> Open in Maps
                    </button>
                  </div>
                  <p className="text-xs text-muted-foreground flex items-start gap-1">
                    <MapPin className="h-3 w-3 mt-0.5 shrink-0 text-primary" />
                    {chosenAddress.display_name}
                  </p>
                </div>
              )}

              <Button
                className="w-full"
                onClick={register}
                disabled={!hospName.trim() || !chosenAddress || registering}
              >
                {registering && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Register &amp; Continue
              </Button>
            </div>
          )}

        </CardContent>
      </Card>
    </div>
  );
}
