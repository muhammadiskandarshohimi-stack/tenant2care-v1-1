BEGIN;
CREATE UNIQUE INDEX IF NOT EXISTS phase4_one_open_tenancy_per_room
 ON public.tenancies(room_id) WHERE status IN ('draft','active');
CREATE UNIQUE INDEX IF NOT EXISTS phase4_one_open_tenancy_per_application
 ON public.tenancies(application_id) WHERE application_id IS NOT NULL AND status IN ('draft','active');

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
 OR v_room.property_id IS DISTINCT FROM v_app.property_id OR v_room.status <> 'reserved'
 OR NOT EXISTS(SELECT 1 FROM public.properties WHERE id=v_room.property_id AND owner_id=(SELECT auth.uid()))
 THEN RAISE EXCEPTION 'The approved room must belong to you and be reserved'; END IF;
 IF EXISTS(SELECT 1 FROM public.tenancies WHERE (room_id=v_room.id OR application_id=v_app.id) AND status IN ('draft','active'))
 THEN RAISE EXCEPTION 'An open tenancy already exists for this room or application'; END IF;
 INSERT INTO public.tenancies(owner_id,application_id,room_id,tenant_id,start_date,term_months,end_date,monthly_rent,deposit_amount,status)
 VALUES((SELECT auth.uid()),v_app.id,v_room.id,v_tenant_id,p_start_date,p_term_months,
 (p_start_date + make_interval(months=>p_term_months))::date - 1,p_monthly_rent,p_deposit_amount,'draft')
 RETURNING id INTO v_id;
 RETURN v_id;
END;
$function$;
REVOKE ALL ON FUNCTION public.phase4_create_tenancy(uuid,date,integer,numeric,numeric) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.phase4_create_tenancy(uuid,date,integer,numeric,numeric) TO authenticated;
COMMIT;
