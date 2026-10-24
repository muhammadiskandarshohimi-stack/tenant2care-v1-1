BEGIN;
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS manual_request_id uuid;
CREATE UNIQUE INDEX IF NOT EXISTS phase5_payment_request_unique ON public.payments(owner_id,manual_request_id) WHERE manual_request_id IS NOT NULL;

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
 IF NOT FOUND OR r.owner_id IS DISTINCT FROM t.owner_id OR r.status<>'reserved' THEN RAISE EXCEPTION 'The room must belong to you and be reserved'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.applications WHERE id=t.application_id AND owner_id=t.owner_id AND room_id=t.room_id AND status='approved') THEN RAISE EXCEPTION 'An approved application is required'; END IF;
 UPDATE public.tenancies SET status='active' WHERE id=t.id;
 UPDATE public.rooms SET status='occupied' WHERE id=r.id;
END;$fn$;

CREATE OR REPLACE FUNCTION public.phase5_record_payment(p_tenancy_id uuid,p_amount numeric,p_payment_type text,p_paid_on date,p_reference text,p_request_id uuid,p_confirm_received boolean)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $fn$
DECLARE t public.tenancies%ROWTYPE; existing public.payments%ROWTYPE; pid uuid; today date:=(now() AT TIME ZONE 'Asia/Kuala_Lumpur')::date;
BEGIN
 IF (SELECT auth.uid()) IS NULL OR NOT EXISTS(SELECT 1 FROM public.profiles WHERE id=(SELECT auth.uid()) AND role='landlord') THEN RAISE EXCEPTION 'Not authorized'; END IF;
 IF p_confirm_received IS DISTINCT FROM true OR p_request_id IS NULL OR p_payment_type IS NULL OR p_payment_type NOT IN ('rent','deposit')
 OR p_amount IS NULL OR NOT(p_amount>0 AND p_amount<=100000000) OR p_amount<>round(p_amount,2)
 OR p_paid_on IS NULL OR p_paid_on<DATE '2000-01-01' OR p_paid_on>today
 OR p_reference IS NULL OR length(btrim(p_reference))<2 OR length(p_reference)>160 THEN RAISE EXCEPTION 'Confirm receipt of money and enter a valid amount, date, type and reference'; END IF;
 SELECT * INTO t FROM public.tenancies WHERE id=p_tenancy_id FOR UPDATE;
 IF NOT FOUND OR t.owner_id IS DISTINCT FROM (SELECT auth.uid()) THEN RAISE EXCEPTION 'Not authorized'; END IF;
 SELECT * INTO existing FROM public.payments WHERE owner_id=t.owner_id AND manual_request_id=p_request_id;
 IF FOUND THEN
  IF existing.tenancy_id IS DISTINCT FROM t.id OR existing.amount IS DISTINCT FROM p_amount OR existing.payment_type IS DISTINCT FROM p_payment_type OR existing.reference IS DISTINCT FROM btrim(p_reference) OR (existing.paid_at AT TIME ZONE 'Asia/Kuala_Lumpur')::date IS DISTINCT FROM p_paid_on THEN RAISE EXCEPTION 'This request was already used with different payment details'; END IF;
  RETURN existing.id;
 END IF;
 IF t.status NOT IN ('draft','active','ended') THEN RAISE EXCEPTION 'Payments cannot be recorded for a cancelled tenancy'; END IF;
 INSERT INTO public.payments(owner_id,tenancy_id,amount,payment_type,status,reference,paid_at,manual_request_id)
 VALUES(t.owner_id,t.id,p_amount,p_payment_type,'paid',btrim(p_reference),p_paid_on::timestamp AT TIME ZONE 'Asia/Kuala_Lumpur',p_request_id) RETURNING id INTO pid;
 INSERT INTO public.receipts(owner_id,payment_id,receipt_number) VALUES(t.owner_id,pid,'T2C-'||upper(replace(pid::text,'-','')));
 RETURN pid;
END;$fn$;

CREATE OR REPLACE FUNCTION public.phase5_balances()
RETURNS TABLE(tenancy_id uuid,rent_due numeric,rent_paid numeric,rent_balance numeric,rent_credit numeric,deposit_agreed numeric,deposit_paid numeric,deposit_remaining numeric,deposit_excess numeric)
LANGUAGE sql STABLE SECURITY INVOKER SET search_path='' AS $fn$
 WITH totals AS (
 SELECT t.id,t.deposit_amount,
 CASE WHEN t.status IN ('active','ended') THEN t.monthly_rent*(SELECT count(*) FROM generate_series(0,t.term_months-1) AS s(n) WHERE (t.start_date+make_interval(months=>s.n))::date <= least((now() AT TIME ZONE 'Asia/Kuala_Lumpur')::date,t.end_date)) ELSE 0::numeric END AS due,
 coalesce(sum(p.amount) FILTER(WHERE p.payment_type='rent'),0) AS rp,
 coalesce(sum(p.amount) FILTER(WHERE p.payment_type='deposit'),0) AS dp
 FROM public.tenancies t LEFT JOIN public.payments p ON p.tenancy_id=t.id AND p.owner_id=t.owner_id AND p.status='paid' AND p.paid_at < (((now() AT TIME ZONE 'Asia/Kuala_Lumpur')::date+1)::timestamp AT TIME ZONE 'Asia/Kuala_Lumpur')
 WHERE t.owner_id=(SELECT auth.uid()) GROUP BY t.id
 )
 SELECT id,due,rp,greatest(due-rp,0),greatest(rp-due,0),deposit_amount,dp,greatest(deposit_amount-dp,0),greatest(dp-deposit_amount,0) FROM totals;
$fn$;
REVOKE ALL ON FUNCTION public.phase5_activate_tenancy(uuid) FROM PUBLIC,anon;
REVOKE ALL ON FUNCTION public.phase5_record_payment(uuid,numeric,text,date,text,uuid,boolean) FROM PUBLIC,anon;
REVOKE ALL ON FUNCTION public.phase5_balances() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.phase5_activate_tenancy(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.phase5_record_payment(uuid,numeric,text,date,text,uuid,boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.phase5_balances() TO authenticated;
COMMIT;
