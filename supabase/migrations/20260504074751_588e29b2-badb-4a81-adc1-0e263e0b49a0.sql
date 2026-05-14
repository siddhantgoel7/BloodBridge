-- Lock search_path on the two helpers that didn't set it
CREATE OR REPLACE FUNCTION public.tg_set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END $$;

CREATE OR REPLACE FUNCTION public.compatible_donor_types(_recipient public.blood_type)
RETURNS public.blood_type[] LANGUAGE SQL IMMUTABLE SET search_path = public AS $$
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

CREATE OR REPLACE FUNCTION public.haversine_km(lat1 DOUBLE PRECISION, lon1 DOUBLE PRECISION, lat2 DOUBLE PRECISION, lon2 DOUBLE PRECISION)
RETURNS DOUBLE PRECISION LANGUAGE SQL IMMUTABLE SET search_path = public AS $$
  SELECT 2 * 6371 * asin(sqrt(
    sin(radians((lat2-lat1)/2))^2 +
    cos(radians(lat1)) * cos(radians(lat2)) *
    sin(radians((lon2-lon1)/2))^2
  ));
$$;

-- Revoke public execute on SECURITY DEFINER functions; only allow authenticated for the ones used in policies
REVOKE EXECUTE ON FUNCTION public.has_role(UUID, public.app_role) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_staff_of(UUID) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.has_role(UUID, public.app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_staff_of(UUID) TO authenticated;