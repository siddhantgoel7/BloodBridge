-- ============== ENUMS ==============
CREATE TYPE public.app_role AS ENUM ('donor', 'hospital_staff', 'admin');
CREATE TYPE public.blood_type AS ENUM ('A+','A-','B+','B-','AB+','AB-','O+','O-');
CREATE TYPE public.ticket_urgency AS ENUM ('low','medium','high','critical');
CREATE TYPE public.ticket_status AS ENUM ('open','in_progress','fulfilled','cancelled','expired');
CREATE TYPE public.response_status AS ENUM ('accepted','declined','checked_in','donated','no_show');

-- ============== USER ROLES ==============
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE POLICY "Users can view their own roles" ON public.user_roles
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- ============== PROFILES (donors) ==============
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL DEFAULT '',
  phone TEXT,
  blood_type public.blood_type,
  date_of_birth DATE,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  is_available BOOLEAN NOT NULL DEFAULT true,
  points INTEGER NOT NULL DEFAULT 0,
  total_donations INTEGER NOT NULL DEFAULT 0,
  last_donation_at TIMESTAMPTZ,
  cooldown_until TIMESTAMPTZ,
  onboarded BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Profiles are viewable by owner" ON public.profiles
  FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "Hospital staff can view donor profiles" ON public.profiles
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'hospital_staff'));
CREATE POLICY "Users can insert their own profile" ON public.profiles
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can update their own profile" ON public.profiles
  FOR UPDATE TO authenticated USING (auth.uid() = id);

-- Auto-create profile and donor role on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, phone)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name',''), NEW.phone);
  -- default role is donor; staff role assigned separately
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, COALESCE((NEW.raw_user_meta_data->>'role')::public.app_role, 'donor'));
  RETURN NEW;
END;
$$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- updated_at trigger
CREATE OR REPLACE FUNCTION public.tg_set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END $$;
CREATE TRIGGER profiles_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- ============== HOSPITALS ==============
CREATE TABLE public.hospitals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  address TEXT NOT NULL,
  city TEXT,
  phone TEXT,
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.hospitals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Hospitals are publicly readable" ON public.hospitals
  FOR SELECT TO authenticated USING (true);

-- ============== HOSPITAL STAFF ==============
CREATE TABLE public.hospital_staff (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  hospital_id UUID NOT NULL REFERENCES public.hospitals(id) ON DELETE CASCADE,
  position TEXT NOT NULL DEFAULT 'staff',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, hospital_id)
);
ALTER TABLE public.hospital_staff ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can view their own hospital memberships" ON public.hospital_staff
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Staff can insert their own membership" ON public.hospital_staff
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id AND public.has_role(auth.uid(),'hospital_staff'));

-- helper: check if current user is staff at a given hospital
CREATE OR REPLACE FUNCTION public.is_staff_of(_hospital_id UUID)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.hospital_staff
    WHERE user_id = auth.uid() AND hospital_id = _hospital_id
  )
$$;

-- ============== BLOOD TICKETS ==============
CREATE TABLE public.blood_tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hospital_id UUID NOT NULL REFERENCES public.hospitals(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  blood_type public.blood_type NOT NULL,
  units_needed INTEGER NOT NULL DEFAULT 1 CHECK (units_needed > 0),
  units_fulfilled INTEGER NOT NULL DEFAULT 0,
  urgency public.ticket_urgency NOT NULL DEFAULT 'medium',
  patient_context TEXT,
  search_radius_km INTEGER NOT NULL DEFAULT 10,
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  status public.ticket_status NOT NULL DEFAULT 'open',
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '24 hours'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.blood_tickets ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER tickets_updated_at BEFORE UPDATE ON public.blood_tickets
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

CREATE POLICY "Donors can view open tickets" ON public.blood_tickets
  FOR SELECT TO authenticated
  USING (status IN ('open','in_progress') OR public.is_staff_of(hospital_id));
CREATE POLICY "Hospital staff can create tickets for their hospital" ON public.blood_tickets
  FOR INSERT TO authenticated
  WITH CHECK (public.is_staff_of(hospital_id) AND created_by = auth.uid());
CREATE POLICY "Hospital staff can update their hospital's tickets" ON public.blood_tickets
  FOR UPDATE TO authenticated USING (public.is_staff_of(hospital_id));

-- ============== TICKET RESPONSES ==============
CREATE TABLE public.ticket_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID NOT NULL REFERENCES public.blood_tickets(id) ON DELETE CASCADE,
  donor_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status public.response_status NOT NULL DEFAULT 'accepted',
  check_in_code TEXT NOT NULL DEFAULT substr(md5(random()::text),1,8),
  responded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  checked_in_at TIMESTAMPTZ,
  donated_at TIMESTAMPTZ,
  UNIQUE (ticket_id, donor_id)
);
ALTER TABLE public.ticket_responses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Donors can view their own responses" ON public.ticket_responses
  FOR SELECT TO authenticated USING (auth.uid() = donor_id);
CREATE POLICY "Hospital staff can view responses to their tickets" ON public.ticket_responses
  FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM public.blood_tickets t
            WHERE t.id = ticket_id AND public.is_staff_of(t.hospital_id))
  );
CREATE POLICY "Donors can create their own response" ON public.ticket_responses
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = donor_id);
CREATE POLICY "Donors can update their own response" ON public.ticket_responses
  FOR UPDATE TO authenticated USING (auth.uid() = donor_id);
CREATE POLICY "Hospital staff can update responses to their tickets" ON public.ticket_responses
  FOR UPDATE TO authenticated USING (
    EXISTS (SELECT 1 FROM public.blood_tickets t
            WHERE t.id = ticket_id AND public.is_staff_of(t.hospital_id))
  );

-- ============== INVENTORY ==============
CREATE TABLE public.inventory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hospital_id UUID NOT NULL REFERENCES public.hospitals(id) ON DELETE CASCADE,
  blood_type public.blood_type NOT NULL,
  units INTEGER NOT NULL DEFAULT 0 CHECK (units >= 0),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (hospital_id, blood_type)
);
ALTER TABLE public.inventory ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER inventory_updated_at BEFORE UPDATE ON public.inventory
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

CREATE POLICY "Staff can view their hospital inventory" ON public.inventory
  FOR SELECT TO authenticated USING (public.is_staff_of(hospital_id));
CREATE POLICY "Staff can update their hospital inventory" ON public.inventory
  FOR ALL TO authenticated
  USING (public.is_staff_of(hospital_id))
  WITH CHECK (public.is_staff_of(hospital_id));

-- ============== DONATIONS ==============
CREATE TABLE public.donations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  donor_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  hospital_id UUID NOT NULL REFERENCES public.hospitals(id),
  ticket_id UUID REFERENCES public.blood_tickets(id),
  blood_type public.blood_type NOT NULL,
  units INTEGER NOT NULL DEFAULT 1,
  points_awarded INTEGER NOT NULL DEFAULT 100,
  verified_by UUID REFERENCES auth.users(id),
  donated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.donations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Donors can view their donations" ON public.donations
  FOR SELECT TO authenticated USING (auth.uid() = donor_id);
CREATE POLICY "Hospital staff can view their hospital donations" ON public.donations
  FOR SELECT TO authenticated USING (public.is_staff_of(hospital_id));

-- ============== HELPERS ==============
-- Blood compatibility: returns donor blood types compatible with a recipient type
CREATE OR REPLACE FUNCTION public.compatible_donor_types(_recipient public.blood_type)
RETURNS public.blood_type[] LANGUAGE SQL IMMUTABLE AS $$
  SELECT CASE _recipient
    WHEN 'O-'  THEN ARRAY['O-']::public.blood_type[]
    WHEN 'O+'  THEN ARRAY['O-','O+']::public.blood_type[]
    WHEN 'A-'  THEN ARRAY['O-','A-']::public.blood_type[]
    WHEN 'A+'  THEN ARRAY['O-','O+','A-','A+']::public.blood_type[]
    WHEN 'B-'  THEN ARRAY['O-','B-']::public.blood_type[]
    WHEN 'B+'  THEN ARRAY['O-','O+','B-','B+']::public.blood_type[]
    WHEN 'AB-' THEN ARRAY['O-','A-','B-','AB-']::public.blood_type[]
    WHEN 'AB+' THEN ARRAY['O-','O+','A-','A+','B-','B+','AB-','AB+']::public.blood_type[]
  END;
$$;

-- Haversine distance in km
CREATE OR REPLACE FUNCTION public.haversine_km(lat1 DOUBLE PRECISION, lon1 DOUBLE PRECISION, lat2 DOUBLE PRECISION, lon2 DOUBLE PRECISION)
RETURNS DOUBLE PRECISION LANGUAGE SQL IMMUTABLE AS $$
  SELECT 2 * 6371 * asin(sqrt(
    sin(radians((lat2-lat1)/2))^2 +
    cos(radians(lat1)) * cos(radians(lat2)) *
    sin(radians((lon2-lon1)/2))^2
  ));
$$;

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.blood_tickets;
ALTER PUBLICATION supabase_realtime ADD TABLE public.ticket_responses;

-- ============== SEED HOSPITALS ==============
INSERT INTO public.hospitals (name, address, city, phone, latitude, longitude) VALUES
  ('SF General Hospital', '1001 Potrero Ave', 'San Francisco', '+14155551001', 37.7558, -122.4060),
  ('UCSF Medical Center', '505 Parnassus Ave', 'San Francisco', '+14155551002', 37.7634, -122.4577),
  ('CPMC Mission Bayfield', '1101 Van Ness Ave', 'San Francisco', '+14155551003', 37.7873, -122.4218);

-- Seed inventory for each hospital, all blood types, 0-30 units
INSERT INTO public.inventory (hospital_id, blood_type, units)
SELECT h.id, bt.bt, (random()*25 + 5)::int
FROM public.hospitals h
CROSS JOIN (SELECT unnest(enum_range(NULL::public.blood_type)) AS bt) bt;