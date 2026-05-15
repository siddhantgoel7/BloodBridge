-- Allow authenticated hospital staff to register new hospitals
CREATE POLICY "Hospital staff can register new hospitals" ON public.hospitals
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'hospital_staff'));

-- Also allow staff to update their own hospital's details in future
CREATE POLICY "Hospital staff can update their hospital" ON public.hospitals
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.hospital_staff
      WHERE hospital_id = id AND user_id = auth.uid()
    )
  );
