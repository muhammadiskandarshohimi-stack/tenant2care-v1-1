BEGIN;
ALTER TABLE public.expenses ADD COLUMN IF NOT EXISTS manual_request_id uuid;
CREATE UNIQUE INDEX IF NOT EXISTS expenses_manual_request_unique ON public.expenses(owner_id,manual_request_id) WHERE manual_request_id IS NOT NULL;
CREATE OR REPLACE FUNCTION public.phase9_record_expense(p_property_id uuid,p_category text,p_amount numeric,p_incurred_on date,p_description text,p_request_id uuid)
RETURNS uuid LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $fn$
DECLARE existing public.expenses%ROWTYPE; eid uuid;
BEGIN
 IF (SELECT auth.uid()) IS NULL OR NOT EXISTS(SELECT 1 FROM public.profiles WHERE id=(SELECT auth.uid()) AND role='landlord') THEN RAISE EXCEPTION 'Not authorized';END IF;
 IF p_request_id IS NULL OR p_category IS NULL OR p_category NOT IN ('repair','maintenance','utilities','other') OR p_amount IS NULL OR NOT(p_amount>0 AND p_amount<=100000000) OR p_amount<>round(p_amount,2) OR p_incurred_on IS NULL OR p_incurred_on<DATE '2000-01-01' OR p_incurred_on>(now() AT TIME ZONE 'Asia/Kuala_Lumpur')::date OR p_description IS NULL OR length(btrim(p_description))<3 OR length(p_description)>1000 THEN RAISE EXCEPTION 'Enter a valid category, amount, past/current date and description';END IF;
 IF p_property_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.properties WHERE id=p_property_id AND owner_id=(SELECT auth.uid())) THEN RAISE EXCEPTION 'Property not found';END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended((SELECT auth.uid())::text||p_request_id::text,0));
 SELECT * INTO existing FROM public.expenses WHERE owner_id=(SELECT auth.uid()) AND manual_request_id=p_request_id;
 IF FOUND THEN
  IF existing.property_id IS DISTINCT FROM p_property_id OR existing.category IS DISTINCT FROM p_category OR existing.amount IS DISTINCT FROM p_amount OR existing.incurred_on IS DISTINCT FROM p_incurred_on OR existing.description IS DISTINCT FROM btrim(p_description) THEN RAISE EXCEPTION 'Request already used for different expense details';END IF;
  RETURN existing.id;
 END IF;
 INSERT INTO public.expenses(owner_id,property_id,category,amount,incurred_on,description,manual_request_id)
 VALUES((SELECT auth.uid()),p_property_id,p_category,p_amount,p_incurred_on,btrim(p_description),p_request_id) RETURNING id INTO eid;
 RETURN eid;
END;$fn$;
CREATE OR REPLACE FUNCTION public.phase9_finances(p_from date,p_to date)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY INVOKER SET search_path='' AS $fn$
DECLARE result jsonb;
BEGIN
 IF (SELECT auth.uid()) IS NULL OR NOT EXISTS(SELECT 1 FROM public.profiles WHERE id=(SELECT auth.uid()) AND role='landlord') THEN RAISE EXCEPTION 'Not authorized';END IF;
 IF p_from IS NULL OR p_to IS NULL OR p_from>p_to OR p_to-p_from>366 OR p_from<DATE '2000-01-01' THEN RAISE EXCEPTION 'Select a valid period of up to one year';END IF;
 WITH paid AS (
 SELECT p.* FROM public.payments p WHERE p.owner_id=(SELECT auth.uid()) AND p.status='paid'
 AND p.paid_at >= (p_from::timestamp AT TIME ZONE 'Asia/Kuala_Lumpur') AND p.paid_at < ((p_to+1)::timestamp AT TIME ZONE 'Asia/Kuala_Lumpur')
 AND p.paid_at < ((((now() AT TIME ZONE 'Asia/Kuala_Lumpur')::date+1)::timestamp) AT TIME ZONE 'Asia/Kuala_Lumpur')
 ), costs AS (
 SELECT e.*,pr.name AS property_name FROM public.expenses e LEFT JOIN public.properties pr ON pr.id=e.property_id AND pr.owner_id=e.owner_id
 WHERE e.owner_id=(SELECT auth.uid()) AND e.incurred_on BETWEEN p_from AND p_to AND e.incurred_on<=(now() AT TIME ZONE 'Asia/Kuala_Lumpur')::date
 )
 SELECT jsonb_build_object('from',p_from,'to',p_to,
 'rent_received',(SELECT coalesce(sum(amount),0) FROM paid WHERE payment_type='rent'),
 'deposits_received',(SELECT coalesce(sum(amount),0) FROM paid WHERE payment_type='deposit'),
 'other_received',(SELECT coalesce(sum(amount),0) FROM paid WHERE payment_type IN ('utility','other')),
 'expenses_total',(SELECT coalesce(sum(amount),0) FROM costs),
 'expenses',coalesce((SELECT jsonb_agg(jsonb_build_object('id',id,'property_name',property_name,'category',category,'amount',amount,'incurred_on',incurred_on,'description',description,'ticket_id',ticket_id) ORDER BY incurred_on DESC,created_at DESC) FROM costs),'[]'::jsonb)) INTO result;
 RETURN result;
END;$fn$;
REVOKE ALL ON FUNCTION public.phase9_record_expense(uuid,text,numeric,date,text,uuid) FROM PUBLIC,anon;
REVOKE ALL ON FUNCTION public.phase9_finances(date,date) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.phase9_record_expense(uuid,text,numeric,date,text,uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.phase9_finances(date,date) TO authenticated;
COMMIT;
