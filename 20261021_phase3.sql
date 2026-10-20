-- Tenant2Care Phase 3. Review against your current schema before applying.
BEGIN;
ALTER TABLE public.applications ADD COLUMN IF NOT EXISTS applicant_user_id uuid REFERENCES auth.users(id);
ALTER TABLE public.applications ADD COLUMN IF NOT EXISTS reviewed_at timestamptz;
ALTER TABLE public.applications ADD COLUMN IF NOT EXISTS reviewed_by uuid REFERENCES auth.users(id);
CREATE INDEX IF NOT EXISTS applications_applicant_user_id_idx ON public.applications(applicant_user_id);
CREATE INDEX IF NOT EXISTS applications_owner_status_idx ON public.applications(owner_id,status);
ALTER TABLE public.applications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS phase3_applicant_select ON public.applications;
CREATE POLICY phase3_applicant_select ON public.applications FOR SELECT TO authenticated USING (applicant_user_id = (select auth.uid()));
-- No direct tenant INSERT/UPDATE grants: submission uses a constrained RPC.
CREATE OR REPLACE FUNCTION public.phase3_available_rooms()
RETURNS TABLE(room_id uuid, property_id uuid, property_name text, room_name text, monthly_rent numeric)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $$
 SELECT r.id, p.id, p.name::text, r.name::text, r.monthly_rent
 FROM public.rooms r JOIN public.properties p ON p.id=r.property_id AND p.owner_id=r.owner_id
 WHERE r.status='available' AND (select auth.uid()) IS NOT NULL
 ORDER BY p.name,r.name;
$$;
REVOKE ALL ON FUNCTION public.phase3_available_rooms() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.phase3_available_rooms() TO authenticated;

CREATE OR REPLACE FUNCTION public.phase3_submit_application(p_room_id uuid,p_full_name text,p_phone text,p_term integer)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_room public.rooms%ROWTYPE; v_id uuid; v_email text;
BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Sign in before applying'; END IF;
 IF p_full_name IS NULL OR length(btrim(p_full_name)) < 2 OR length(p_full_name)>160 THEN RAISE EXCEPTION 'Invalid full name'; END IF;
 IF p_phone IS NULL OR length(btrim(p_phone))<6 OR length(p_phone)>32 THEN RAISE EXCEPTION 'Invalid phone'; END IF;
 IF p_term NOT IN (6,12) THEN RAISE EXCEPTION 'Select a 6 or 12 month term'; END IF;
 SELECT email INTO v_email FROM auth.users WHERE id=auth.uid() AND email_confirmed_at IS NOT NULL;
 IF v_email IS NULL THEN RAISE EXCEPTION 'Confirm your email first'; END IF;
 SELECT * INTO v_room FROM public.rooms WHERE id=p_room_id AND status='available' FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Room is no longer available'; END IF;
 IF EXISTS (SELECT 1 FROM public.applications WHERE room_id=p_room_id AND applicant_user_id=auth.uid() AND status IN ('pending','approved')) THEN
  RAISE EXCEPTION 'You already have an active application for this room';
 END IF;
 INSERT INTO public.applications (owner_id,property_id,room_id,full_name,email,phone,requested_term_months,status,applicant_user_id)
 VALUES (v_room.owner_id,v_room.property_id,v_room.id,btrim(p_full_name),v_email,btrim(p_phone),p_term,'pending',auth.uid()) RETURNING id INTO v_id;
 RETURN v_id;
END; $$;
REVOKE ALL ON FUNCTION public.phase3_submit_application(uuid,text,text,integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.phase3_submit_application(uuid,text,text,integer) TO authenticated;

CREATE OR REPLACE FUNCTION public.phase3_review_application(p_application_id uuid,p_decision text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_app public.applications%ROWTYPE; v_status text;
BEGIN
 IF auth.uid() IS NULL OR p_decision NOT IN ('approved','rejected') THEN RAISE EXCEPTION 'Invalid request'; END IF;
 SELECT * INTO v_app FROM public.applications WHERE id=p_application_id FOR UPDATE;
 IF NOT FOUND OR v_app.owner_id<>auth.uid() OR NOT EXISTS (SELECT 1 FROM public.profiles WHERE id=auth.uid() AND role='landlord') THEN
  RAISE EXCEPTION 'Not authorized';
 END IF;
 IF v_app.status<>'pending' THEN RAISE EXCEPTION 'Application already reviewed'; END IF;
 IF p_decision='approved' THEN
  SELECT status INTO v_status FROM public.rooms WHERE id=v_app.room_id AND owner_id=auth.uid() FOR UPDATE;
  IF v_status IS DISTINCT FROM 'available' THEN RAISE EXCEPTION 'Room is no longer available'; END IF;
  UPDATE public.rooms SET status='reserved' WHERE id=v_app.room_id AND owner_id=auth.uid();
 END IF;
 UPDATE public.applications SET status=p_decision,reviewed_at=now(),reviewed_by=auth.uid() WHERE id=v_app.id;
END; $$;
REVOKE ALL ON FUNCTION public.phase3_review_application(uuid,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.phase3_review_application(uuid,text) TO authenticated;
COMMIT;
