BEGIN;
ALTER TABLE public.agreements ADD COLUMN IF NOT EXISTS draft_snapshot jsonb,
 ADD COLUMN IF NOT EXISTS draft_version integer, ADD COLUMN IF NOT EXISTS draft_request_id uuid;
CREATE UNIQUE INDEX IF NOT EXISTS phase6_agreement_version ON public.agreements(tenancy_id,draft_version) WHERE draft_version IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS phase6_agreement_request ON public.agreements(owner_id,draft_request_id) WHERE draft_request_id IS NOT NULL;
CREATE OR REPLACE FUNCTION public.phase6_create_agreement(p_tenancy_id uuid,p_landlord_name text,p_additional_terms text,p_request_id uuid)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $fn$
DECLARE t public.tenancies%ROWTYPE; a public.applications%ROWTYPE; r public.rooms%ROWTYPE; prop public.properties%ROWTYPE; prior public.agreements%ROWTYPE; v integer; result uuid;
BEGIN
 IF (SELECT auth.uid()) IS NULL OR NOT EXISTS(SELECT 1 FROM public.profiles WHERE id=(SELECT auth.uid()) AND role='landlord') THEN RAISE EXCEPTION 'Not authorized'; END IF;
 IF p_request_id IS NULL OR p_landlord_name IS NULL OR length(btrim(p_landlord_name))<2 OR length(p_landlord_name)>160 OR length(coalesce(p_additional_terms,''))>10000 THEN RAISE EXCEPTION 'Enter the landlord name and keep additional terms within 10000 characters'; END IF;
 SELECT * INTO t FROM public.tenancies WHERE id=p_tenancy_id FOR UPDATE;
 IF NOT FOUND OR t.owner_id IS DISTINCT FROM (SELECT auth.uid()) THEN RAISE EXCEPTION 'Not authorized'; END IF;
 SELECT * INTO prior FROM public.agreements WHERE owner_id=t.owner_id AND draft_request_id=p_request_id;
 IF FOUND THEN
  IF prior.tenancy_id IS DISTINCT FROM t.id OR prior.draft_snapshot->>'landlord_name' IS DISTINCT FROM btrim(p_landlord_name) OR prior.draft_snapshot->>'additional_terms' IS DISTINCT FROM coalesce(p_additional_terms,'') THEN RAISE EXCEPTION 'This request has already been used for different agreement details'; END IF;
  RETURN prior.id;
 END IF;
 IF t.status NOT IN ('draft','active') OR t.end_date IS NULL OR t.end_date<t.start_date THEN RAISE EXCEPTION 'Select a draft or active tenancy with complete dates'; END IF;
 SELECT * INTO a FROM public.applications WHERE id=t.application_id AND owner_id=t.owner_id;
 IF NOT FOUND OR a.status<>'approved' OR a.room_id IS DISTINCT FROM t.room_id THEN RAISE EXCEPTION 'An approved application linked to this tenancy is required'; END IF;
 SELECT * INTO r FROM public.rooms WHERE id=t.room_id AND owner_id=t.owner_id;
 IF NOT FOUND THEN RAISE EXCEPTION 'Room ownership mismatch'; END IF;
 SELECT * INTO prop FROM public.properties WHERE id=r.property_id AND owner_id=t.owner_id;
 IF NOT FOUND OR prop.id IS DISTINCT FROM a.property_id THEN RAISE EXCEPTION 'Property ownership mismatch'; END IF;
 SELECT coalesce(max(draft_version),0)+1 INTO v FROM public.agreements WHERE tenancy_id=t.id;
 INSERT INTO public.agreements(owner_id,tenancy_id,template_name,status,draft_version,draft_request_id,draft_snapshot)
 VALUES(t.owner_id,t.id,'Tenant2Care tenancy draft v1','draft',v,p_request_id,jsonb_build_object(
 'template_version',1,'landlord_name',btrim(p_landlord_name),'tenant_name',a.full_name,'tenant_email',a.email,'tenant_phone',a.phone,
 'property_name',prop.name,'property_address',coalesce(nullif(btrim(prop.address),''),'[PROPERTY ADDRESS TO BE COMPLETED]'),'room_name',r.name,
 'start_date',t.start_date,'end_date',t.end_date,'term_months',t.term_months,'monthly_rent',t.monthly_rent,'deposit_amount',t.deposit_amount,
 'additional_terms',coalesce(p_additional_terms,''))) RETURNING id INTO result;
 RETURN result;
END;$fn$;
REVOKE ALL ON FUNCTION public.phase6_create_agreement(uuid,text,text,uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.phase6_create_agreement(uuid,text,text,uuid) TO authenticated;
COMMIT;
