CREATE OR REPLACE FUNCTION public.valid_landlord_agreement_details(p jsonb)
RETURNS boolean LANGUAGE plpgsql IMMUTABLE SECURITY INVOKER SET search_path='' AS $fn$
BEGIN
 IF p IS NULL OR jsonb_typeof(p)<>'object' THEN RETURN false; END IF;
 IF EXISTS(SELECT 1 FROM jsonb_each(p) e WHERE e.key NOT IN ('landlord_nric','landlord_phone','landlord_email','landlord_address','witness_name','witness_nric','payment_method','bank_name','account_holder','bank_account','payment_day') OR jsonb_typeof(e.value)<>'string' OR length(e.value #>> '{}')>CASE WHEN e.key='landlord_address' THEN 1000 ELSE 160 END) THEN RETURN false; END IF;
 IF coalesce(nullif(p->>'payment_day',''),'1') !~ '^([1-9]|[12][0-9]|3[01])$' THEN RETURN false; END IF;
 IF EXISTS(SELECT 1 FROM jsonb_each_text(p) e WHERE e.key IN ('landlord_nric','witness_nric') AND btrim(e.value)<>'' AND regexp_replace(e.value,'[-[:space:]]','','g') !~ '^[0-9]{12}$') THEN RETURN false; END IF;
 RETURN true;
END;$fn$;
CREATE OR REPLACE FUNCTION public.valid_property_inventory(p jsonb)
RETURNS boolean LANGUAGE plpgsql IMMUTABLE SECURITY INVOKER SET search_path='' AS $fn$
DECLARE item jsonb;
BEGIN
 IF p IS NULL OR jsonb_typeof(p)<>'array' THEN RETURN false; END IF;
 IF jsonb_array_length(p)>50 THEN RETURN false; END IF;
 FOR item IN SELECT value FROM jsonb_array_elements(p) LOOP
  IF jsonb_typeof(item)<>'object' OR jsonb_typeof(item->'name') IS DISTINCT FROM 'string' OR length(btrim(item->>'name')) NOT BETWEEN 1 AND 100 OR jsonb_typeof(item->'quantity') IS DISTINCT FROM 'number' THEN RETURN false; END IF;
  IF item->>'quantity' !~ '^[1-9][0-9]{0,4}$' THEN RETURN false; END IF;
  IF (item->>'quantity')::integer>10000 THEN RETURN false; END IF;
  IF EXISTS(SELECT 1 FROM jsonb_each(item) e WHERE e.key NOT IN ('name','quantity','unit','notes')) THEN RETURN false; END IF;
  IF item?'unit' AND (jsonb_typeof(item->'unit')<>'string' OR length(item->>'unit')>20) THEN RETURN false; END IF;
  IF item?'notes' AND (jsonb_typeof(item->'notes')<>'string' OR length(item->>'notes')>160) THEN RETURN false; END IF;
 END LOOP;
 RETURN true;
END;$fn$;
CREATE TABLE public.landlord_agreement_settings(
 owner_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
 landlord_name text NOT NULL CHECK(char_length(btrim(landlord_name)) BETWEEN 2 AND 160),
 details jsonb NOT NULL DEFAULT '{}'::jsonb CHECK(public.valid_landlord_agreement_details(details)),
 updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.property_inventories(
 property_id uuid PRIMARY KEY REFERENCES public.properties(id) ON DELETE CASCADE,
 owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
 items jsonb NOT NULL DEFAULT '[]'::jsonb CHECK(public.valid_property_inventory(items)),
 updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX property_inventories_owner_idx ON public.property_inventories(owner_id);
ALTER TABLE public.landlord_agreement_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.property_inventories ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.landlord_agreement_settings,public.property_inventories FROM PUBLIC,anon;
GRANT SELECT,INSERT,UPDATE,DELETE ON public.landlord_agreement_settings,public.property_inventories TO authenticated;
CREATE POLICY landlord_agreement_settings_owner ON public.landlord_agreement_settings TO authenticated
 USING(owner_id=(SELECT auth.uid()) AND EXISTS(SELECT 1 FROM public.profiles WHERE id=(SELECT auth.uid()) AND role='landlord'))
 WITH CHECK(owner_id=(SELECT auth.uid()) AND EXISTS(SELECT 1 FROM public.profiles WHERE id=(SELECT auth.uid()) AND role='landlord'));
CREATE POLICY property_inventories_owner ON public.property_inventories TO authenticated
 USING(owner_id=(SELECT auth.uid()) AND EXISTS(SELECT 1 FROM public.profiles WHERE id=(SELECT auth.uid()) AND role='landlord'))
 WITH CHECK(owner_id=(SELECT auth.uid()) AND EXISTS(SELECT 1 FROM public.profiles WHERE id=(SELECT auth.uid()) AND role='landlord') AND EXISTS(SELECT 1 FROM public.properties WHERE id=property_id AND owner_id=(SELECT auth.uid())));
-- Let the existing immutable-draft generator include the saved contact fields.
DO $migration$
DECLARE definition text:=pg_get_functiondef('public.phase6_create_agreement(uuid,text,text,uuid,jsonb)'::regprocedure);
BEGIN
 IF strpos(definition,$old$('landlord_nric','tenant_occupation'$old$)=0 OR strpos(definition,$old$CASE WHEN e.key='inventory' THEN 4000 ELSE 160 END$old$)=0 THEN RAISE EXCEPTION 'Agreement details validation changed; review first'; END IF;
 definition:=replace(definition,$old$('landlord_nric','tenant_occupation'$old$,$new$('landlord_nric','landlord_phone','landlord_email','landlord_address','tenant_occupation'$new$);
 definition:=replace(definition,$old$CASE WHEN e.key='inventory' THEN 4000 ELSE 160 END$old$,$new$CASE WHEN e.key='inventory' THEN 20000 WHEN e.key='landlord_address' THEN 1000 ELSE 160 END$new$);
 EXECUTE definition;
END;$migration$;
CREATE OR REPLACE FUNCTION public.phase10_create_saved_agreement(p_tenancy_id uuid,p_additional_terms text,p_request_id uuid,p_details jsonb)
RETURNS uuid LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $fn$
DECLARE v_settings public.landlord_agreement_settings%ROWTYPE; v_property uuid; v_items jsonb; v_inventory text; v_details jsonb;
BEGIN
 IF (SELECT auth.uid()) IS NULL OR NOT EXISTS(SELECT 1 FROM public.profiles WHERE id=(SELECT auth.uid()) AND role='landlord') THEN RAISE EXCEPTION 'Not authorized'; END IF;
 IF p_details IS NULL OR jsonb_typeof(p_details)<>'object' THEN RAISE EXCEPTION 'Invalid tenancy details'; END IF;
 IF EXISTS(SELECT 1 FROM jsonb_each(p_details) e WHERE e.key NOT IN ('tenant_occupation','utility_deposit') OR jsonb_typeof(e.value)<>'string') THEN RAISE EXCEPTION 'Landlord, payment and inventory information must come from saved settings'; END IF;
 SELECT r.property_id INTO v_property FROM public.tenancies t JOIN public.rooms r ON r.id=t.room_id AND r.owner_id=t.owner_id WHERE t.id=p_tenancy_id AND t.owner_id=(SELECT auth.uid());
 IF NOT FOUND THEN RAISE EXCEPTION 'Not authorized'; END IF;
 SELECT * INTO v_settings FROM public.landlord_agreement_settings WHERE owner_id=(SELECT auth.uid());
 IF NOT FOUND THEN RAISE EXCEPTION 'Save your landlord and payment information under Settings first'; END IF;
 SELECT items INTO v_items FROM public.property_inventories WHERE property_id=v_property AND owner_id=(SELECT auth.uid());
 SELECT coalesce(string_agg((value->>'name')||' × '||(value->>'quantity')||CASE WHEN coalesce(value->>'unit','')<>'' THEN ' '||(value->>'unit') ELSE '' END||CASE WHEN coalesce(value->>'notes','')<>'' THEN ' — '||(value->>'notes') ELSE '' END,E'\n' ORDER BY ordinality),'') INTO v_inventory FROM jsonb_array_elements(coalesce(v_items,'[]'::jsonb)) WITH ORDINALITY;
 v_details:=v_settings.details||jsonb_build_object('inventory',v_inventory,'tenant_occupation',coalesce(p_details->>'tenant_occupation',''),'utility_deposit',coalesce(nullif(p_details->>'utility_deposit',''),'0'));
 RETURN public.phase6_create_agreement(p_tenancy_id,v_settings.landlord_name,p_additional_terms,p_request_id,v_details);
END;$fn$;
REVOKE ALL ON FUNCTION public.phase10_create_saved_agreement(uuid,text,uuid,jsonb) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.phase10_create_saved_agreement(uuid,text,uuid,jsonb) TO authenticated;
