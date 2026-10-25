-- Shared-room capacity. Apply after Phases 3–9; default capacity stays 1.
BEGIN;
ALTER TABLE public.rooms ADD COLUMN IF NOT EXISTS capacity integer NOT NULL DEFAULT 1;
ALTER TABLE public.rooms DROP CONSTRAINT IF EXISTS rooms_capacity_range;
ALTER TABLE public.rooms ADD CONSTRAINT rooms_capacity_range CHECK (capacity BETWEEN 1 AND 2);
DROP INDEX IF EXISTS public.phase4_one_open_tenancy_per_room;
DROP INDEX IF EXISTS public.tenancies_one_live_room;
CREATE UNIQUE INDEX IF NOT EXISTS phase4_one_open_tenancy_per_application
 ON public.tenancies(application_id) WHERE application_id IS NOT NULL AND status IN ('draft','active');

-- A reservation and its tenancy represent one place, never two. Historical
-- tenancies must not resurrect an old approved application as a reservation.
CREATE OR REPLACE FUNCTION public.room_allocated_places(p_room_id uuid)
RETURNS bigint LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT (SELECT count(*) FROM public.tenancies WHERE room_id=p_room_id AND status IN ('draft','active'))
 + (SELECT count(*) FROM public.applications a WHERE a.room_id=p_room_id AND a.status='approved'
 AND NOT EXISTS(SELECT 1 FROM public.tenancies t WHERE t.application_id=a.id));
$$;
REVOKE ALL ON FUNCTION public.room_allocated_places(uuid) FROM PUBLIC,anon,authenticated;

-- All allocation writes serialize on the room, including direct landlord edits.
CREATE OR REPLACE FUNCTION public.lock_room_allocation()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
 IF TG_OP='INSERT' THEN
  PERFORM 1 FROM public.rooms WHERE id=NEW.room_id FOR UPDATE;
 ELSIF TG_OP='DELETE' THEN
  PERFORM 1 FROM public.rooms WHERE id=OLD.room_id FOR UPDATE;
 ELSE
  PERFORM 1 FROM public.rooms WHERE id IN (OLD.room_id,NEW.room_id) ORDER BY id FOR UPDATE;
 END IF;
 IF TG_OP='DELETE' THEN RETURN OLD; END IF;
 IF NEW.room_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.rooms WHERE id=NEW.room_id AND owner_id=NEW.owner_id) THEN RAISE EXCEPTION 'Room ownership mismatch'; END IF;
 RETURN NEW;
END;$$;
CREATE OR REPLACE FUNCTION public.check_room_allocation()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE rid uuid; ids uuid[]; r public.rooms%ROWTYPE;
BEGIN
 IF TG_OP='INSERT' THEN ids:=ARRAY[NEW.room_id];
 ELSIF TG_OP='DELETE' THEN ids:=ARRAY[OLD.room_id];
 ELSE ids:=ARRAY[OLD.room_id,NEW.room_id]; END IF;
 FOREACH rid IN ARRAY ids LOOP
  SELECT * INTO r FROM public.rooms WHERE id=rid FOR UPDATE;
  IF NOT FOUND THEN CONTINUE; END IF;
  IF public.room_allocated_places(rid)>r.capacity THEN RAISE EXCEPTION 'Room capacity exceeded (maximum % tenants)',r.capacity; END IF;
  IF r.status<>'inactive' THEN
   UPDATE public.rooms SET status=CASE
    WHEN EXISTS(SELECT 1 FROM public.tenancies WHERE room_id=rid AND status='active') THEN 'occupied'
    WHEN public.room_allocated_places(rid)>0 THEN 'reserved' ELSE 'available' END WHERE id=rid;
  END IF;
 END LOOP;
 RETURN NULL;
END;$$;
CREATE OR REPLACE FUNCTION public.check_room_capacity_change()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
 IF NEW.capacity<public.room_allocated_places(NEW.id) THEN RAISE EXCEPTION 'Capacity cannot be below existing reservations and tenancies'; END IF;
 RETURN NEW;
END;$$;
DROP TRIGGER IF EXISTS shared_room_capacity_change ON public.rooms;
CREATE TRIGGER shared_room_capacity_change BEFORE UPDATE OF capacity ON public.rooms FOR EACH ROW EXECUTE FUNCTION public.check_room_capacity_change();
DO $$ DECLARE tab text; BEGIN
 FOREACH tab IN ARRAY ARRAY['applications','tenancies'] LOOP
 EXECUTE format('DROP TRIGGER IF EXISTS shared_room_lock ON public.%I',tab);
 EXECUTE format('CREATE TRIGGER shared_room_lock BEFORE INSERT OR UPDATE OR DELETE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.lock_room_allocation()',tab);
 EXECUTE format('DROP TRIGGER IF EXISTS shared_room_check ON public.%I',tab);
 EXECUTE format('CREATE TRIGGER shared_room_check AFTER INSERT OR UPDATE OR DELETE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.check_room_allocation()',tab);
 END LOOP;
END;$$;
REVOKE ALL ON FUNCTION public.lock_room_allocation(),public.check_room_allocation(),public.check_room_capacity_change() FROM PUBLIC,anon,authenticated;
CREATE OR REPLACE FUNCTION public.phase3_available_rooms()
RETURNS TABLE(room_id uuid, property_id uuid, property_name text, room_name text, monthly_rent numeric)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $$
 SELECT r.id, p.id, p.name::text, r.name::text, r.monthly_rent
 FROM public.rooms r JOIN public.properties p ON p.id=r.property_id AND p.owner_id=r.owner_id
 WHERE r.status IN ('available','reserved','occupied') AND (r.capacity>1 OR r.status='available') AND public.room_allocated_places(r.id)<r.capacity AND (select auth.uid()) IS NOT NULL
 ORDER BY p.name,r.name;
$$;
REVOKE ALL ON FUNCTION public.phase3_available_rooms() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.phase3_available_rooms() TO authenticated;

CREATE OR REPLACE FUNCTION public.phase3_submit_application(p_room_id uuid,p_full_name text,p_phone text,p_term integer)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_room public.rooms%ROWTYPE; v_id uuid; v_email text;
BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Sign in before applying'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.profiles WHERE id=auth.uid() AND role='tenant') THEN RAISE EXCEPTION 'Only tenant accounts can submit applications'; END IF;
 IF p_full_name IS NULL OR length(btrim(p_full_name)) < 2 OR length(p_full_name)>160 THEN RAISE EXCEPTION 'Invalid full name'; END IF;
 IF p_phone IS NULL OR length(btrim(p_phone))<6 OR length(p_phone)>32 THEN RAISE EXCEPTION 'Invalid phone'; END IF;
 IF p_term IS NULL OR p_term NOT IN (6,12) THEN RAISE EXCEPTION 'Select a 6 or 12 month term'; END IF;
 SELECT email INTO v_email FROM auth.users WHERE id=auth.uid() AND email_confirmed_at IS NOT NULL;
 IF v_email IS NULL THEN RAISE EXCEPTION 'Confirm your email first'; END IF;
 SELECT r.* INTO v_room FROM public.rooms r JOIN public.properties p ON p.id=r.property_id AND p.owner_id=r.owner_id WHERE r.id=p_room_id FOR UPDATE OF r;
 IF NOT FOUND OR v_room.status='inactive' OR (v_room.capacity=1 AND v_room.status<>'available') OR public.room_allocated_places(v_room.id)>=v_room.capacity THEN RAISE EXCEPTION 'Room has no available tenant places'; END IF;
 IF EXISTS (SELECT 1 FROM public.applications WHERE room_id=p_room_id AND applicant_user_id=auth.uid() AND status IN ('pending','submitted','review','approved')) THEN
  RAISE EXCEPTION 'You already have an active application for this room';
 END IF;
 INSERT INTO public.applications (owner_id,property_id,room_id,full_name,email,phone,requested_term_months,status,applicant_user_id,tenant_id)
 VALUES (v_room.owner_id,v_room.property_id,v_room.id,btrim(p_full_name),v_email,btrim(p_phone),p_term,'submitted',auth.uid(),auth.uid()) RETURNING id INTO v_id;
 RETURN v_id;
END; $$;
REVOKE ALL ON FUNCTION public.phase3_submit_application(uuid,text,text,integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.phase3_submit_application(uuid,text,text,integer) TO authenticated;

CREATE OR REPLACE FUNCTION public.phase3_review_application(p_application_id uuid,p_decision text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_app public.applications%ROWTYPE; v_room public.rooms%ROWTYPE;
BEGIN
 IF auth.uid() IS NULL OR p_decision IS NULL OR p_decision NOT IN ('approved','rejected') THEN RAISE EXCEPTION 'Invalid request'; END IF;
 SELECT * INTO v_app FROM public.applications WHERE id=p_application_id FOR UPDATE;
 IF NOT FOUND OR v_app.owner_id IS DISTINCT FROM auth.uid() OR NOT EXISTS (SELECT 1 FROM public.profiles WHERE id=auth.uid() AND role='landlord') THEN
  RAISE EXCEPTION 'Not authorized';
 END IF;
 IF v_app.status NOT IN ('pending','submitted','review') THEN RAISE EXCEPTION 'Application already reviewed'; END IF;
 IF p_decision='approved' THEN
  SELECT * INTO v_room FROM public.rooms WHERE id=v_app.room_id AND owner_id=auth.uid() AND property_id=v_app.property_id AND EXISTS(SELECT 1 FROM public.properties p WHERE p.id=v_app.property_id AND p.owner_id=auth.uid()) FOR UPDATE;
  IF NOT FOUND OR v_room.status='inactive' OR (v_room.capacity=1 AND v_room.status<>'available') OR public.room_allocated_places(v_room.id)>=v_room.capacity THEN RAISE EXCEPTION 'Room has no available tenant places'; END IF;
  -- Allocation trigger refreshes the room status after approval.
 END IF;
 UPDATE public.applications SET status=p_decision,reviewed_at=now(),reviewed_by=auth.uid() WHERE id=v_app.id;
END; $$;
REVOKE ALL ON FUNCTION public.phase3_review_application(uuid,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.phase3_review_application(uuid,text) TO authenticated;
CREATE OR REPLACE FUNCTION public.phase4_create_tenancy(
 p_application_id uuid, p_start_date date, p_term_months integer,
 p_monthly_rent numeric, p_deposit_amount numeric
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $function$
DECLARE
 v_app public.applications%ROWTYPE;
 v_room public.rooms%ROWTYPE;
 v_id uuid;
 v_tenant_id uuid;
BEGIN
 IF (SELECT auth.uid()) IS NULL OR NOT EXISTS(
  SELECT 1 FROM public.profiles WHERE id=(SELECT auth.uid()) AND role='landlord'
 ) THEN RAISE EXCEPTION 'Not authorized'; END IF;
 IF p_start_date IS NULL OR p_start_date < DATE '2000-01-01' OR p_start_date > DATE '2100-12-31'
 OR p_term_months IS NULL OR p_term_months NOT IN (6,12)
 OR p_monthly_rent IS NULL OR NOT (p_monthly_rent > 0 AND p_monthly_rent <= 100000000)
 OR p_monthly_rent <> round(p_monthly_rent,2)
 OR p_deposit_amount IS NULL OR NOT (p_deposit_amount >= 0 AND p_deposit_amount <= 100000000)
 OR p_deposit_amount <> round(p_deposit_amount,2)
 THEN RAISE EXCEPTION 'Enter a valid start date, 6 or 12 month term, positive rent and non-negative deposit (up to two decimal places)'; END IF;
 SELECT * INTO v_app FROM public.applications WHERE id=p_application_id FOR UPDATE;
 IF NOT FOUND OR v_app.owner_id IS DISTINCT FROM (SELECT auth.uid()) OR v_app.status <> 'approved'
 THEN RAISE EXCEPTION 'Select an approved application belonging to your account'; END IF;
 v_tenant_id := coalesce(v_app.applicant_user_id,v_app.tenant_id);
 IF v_tenant_id IS NULL THEN RAISE EXCEPTION 'This application is not linked to a tenant account'; END IF;
 SELECT * INTO v_room FROM public.rooms WHERE id=v_app.room_id FOR UPDATE;
 IF NOT FOUND OR v_room.owner_id IS DISTINCT FROM (SELECT auth.uid())
 OR v_room.property_id IS DISTINCT FROM v_app.property_id OR v_room.status NOT IN ('reserved','occupied')
 OR NOT EXISTS(SELECT 1 FROM public.properties WHERE id=v_room.property_id AND owner_id=(SELECT auth.uid()))
 THEN RAISE EXCEPTION 'The approved room must belong to you and be reserved'; END IF;
 IF EXISTS(SELECT 1 FROM public.tenancies WHERE application_id=v_app.id AND status IN ('draft','active'))
 THEN RAISE EXCEPTION 'An open tenancy already exists for this application'; END IF;
 IF (SELECT count(*) FROM public.tenancies WHERE room_id=v_room.id AND status IN ('draft','active'))>=v_room.capacity THEN RAISE EXCEPTION 'Room tenancy capacity reached'; END IF;
 INSERT INTO public.tenancies(owner_id,application_id,room_id,tenant_id,start_date,term_months,end_date,monthly_rent,deposit_amount,status)
 VALUES((SELECT auth.uid()),v_app.id,v_room.id,v_tenant_id,p_start_date,p_term_months,
 (p_start_date + make_interval(months=>p_term_months))::date - 1,p_monthly_rent,p_deposit_amount,'draft')
 RETURNING id INTO v_id;
 RETURN v_id;
END;
$function$;
REVOKE ALL ON FUNCTION public.phase4_create_tenancy(uuid,date,integer,numeric,numeric) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.phase4_create_tenancy(uuid,date,integer,numeric,numeric) TO authenticated;
CREATE OR REPLACE FUNCTION public.phase5_activate_tenancy(p_tenancy_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $fn$
DECLARE t public.tenancies%ROWTYPE; r public.rooms%ROWTYPE; today date:=(now() AT TIME ZONE 'Asia/Kuala_Lumpur')::date;
BEGIN
 IF (SELECT auth.uid()) IS NULL OR NOT EXISTS(SELECT 1 FROM public.profiles WHERE id=(SELECT auth.uid()) AND role='landlord') THEN RAISE EXCEPTION 'Not authorized'; END IF;
 SELECT * INTO t FROM public.tenancies WHERE id=p_tenancy_id FOR UPDATE;
 IF NOT FOUND OR t.owner_id IS DISTINCT FROM (SELECT auth.uid()) THEN RAISE EXCEPTION 'Not authorized'; END IF;
 IF t.status <> 'draft' THEN RAISE EXCEPTION 'Only a draft tenancy can be activated'; END IF;
 IF t.start_date>today THEN RAISE EXCEPTION 'The tenancy has not started yet'; END IF;
 IF t.end_date IS NULL OR t.end_date<today THEN RAISE EXCEPTION 'The tenancy dates have expired or are incomplete'; END IF;
 SELECT * INTO r FROM public.rooms WHERE id=t.room_id FOR UPDATE;
 IF NOT FOUND OR r.owner_id IS DISTINCT FROM t.owner_id OR r.status NOT IN ('reserved','occupied') THEN RAISE EXCEPTION 'The room must belong to you and be reserved'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.applications WHERE id=t.application_id AND owner_id=t.owner_id AND room_id=t.room_id AND status='approved') THEN RAISE EXCEPTION 'An approved application is required'; END IF;
 UPDATE public.tenancies SET status='active' WHERE id=t.id;
 UPDATE public.rooms SET status='occupied' WHERE id=r.id;
END;$fn$;


REVOKE ALL ON FUNCTION public.phase5_activate_tenancy(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.phase5_activate_tenancy(uuid) TO authenticated;
COMMIT;
