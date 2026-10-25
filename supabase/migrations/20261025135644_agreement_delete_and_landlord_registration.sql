ALTER TABLE public.agreements ADD COLUMN IF NOT EXISTS deleted_at timestamptz,
 ADD COLUMN IF NOT EXISTS deleted_by uuid REFERENCES auth.users(id) ON DELETE SET NULL;
CREATE OR REPLACE FUNCTION public.phase11_set_agreement_deleted(p_agreement_id uuid,p_deleted boolean)
RETURNS void LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $fn$
BEGIN
 IF (SELECT auth.uid()) IS NULL OR p_deleted IS NULL OR NOT EXISTS(SELECT 1 FROM public.profiles WHERE id=(SELECT auth.uid()) AND role='landlord') THEN RAISE EXCEPTION 'Not authorized'; END IF;
 UPDATE public.agreements SET deleted_at=CASE WHEN p_deleted THEN coalesce(deleted_at,now()) ELSE NULL END,deleted_by=CASE WHEN p_deleted THEN (SELECT auth.uid()) ELSE NULL END WHERE id=p_agreement_id AND owner_id=(SELECT auth.uid());
 IF NOT FOUND THEN RAISE EXCEPTION 'Agreement not found or access denied'; END IF;
END;$fn$;
REVOKE ALL ON FUNCTION public.phase11_set_agreement_deleted(uuid,boolean) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.phase11_set_agreement_deleted(uuid,boolean) TO authenticated;
-- Registration creates an owner-scoped landlord workspace only for the caller.
-- No role is accepted from JWT user metadata or from a supplied user ID.
CREATE OR REPLACE FUNCTION public.phase11_register_landlord(p_display_name text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $fn$
DECLARE v_user uuid:=(SELECT auth.uid()); v_role text;
BEGIN
 IF v_user IS NULL OR NOT EXISTS(SELECT 1 FROM auth.users WHERE id=v_user AND email_confirmed_at IS NOT NULL AND nullif(email,'') IS NOT NULL) THEN RAISE EXCEPTION 'Verify your email and sign in before completing landlord registration'; END IF;
 IF p_display_name IS NULL OR char_length(btrim(p_display_name)) NOT BETWEEN 2 AND 160 THEN RAISE EXCEPTION 'Enter your full name (2 to 160 characters)'; END IF;
 SELECT role INTO v_role FROM public.profiles WHERE id=v_user FOR UPDATE;
 IF v_role='landlord' THEN RETURN; END IF;
 IF v_role IS NOT NULL AND v_role<>'tenant' THEN RAISE EXCEPTION 'This account cannot register as a landlord'; END IF;
 IF EXISTS(SELECT 1 FROM public.applications WHERE applicant_user_id=v_user OR tenant_id=v_user) OR EXISTS(SELECT 1 FROM public.tenancies WHERE tenant_id=v_user) THEN RAISE EXCEPTION 'This email is already linked to tenant records. Use a separate email for your landlord account'; END IF;
 INSERT INTO public.profiles(id,display_name,role) VALUES(v_user,btrim(p_display_name),'landlord') ON CONFLICT(id) DO UPDATE SET display_name=excluded.display_name,role='landlord';
END;$fn$;
REVOKE ALL ON FUNCTION public.phase11_register_landlord(text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.phase11_register_landlord(text) TO authenticated;
-- Owner datasets stay private to the authenticated landlord who owns each row.
DO $policies$
DECLARE t text;
BEGIN
 FOREACH t IN ARRAY ARRAY['properties','rooms','applications','tenancies','payments','maintenance_tickets','expenses','agreements','receipts'] LOOP
  EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I',t||'_owner_only',t);
  EXECUTE format('CREATE POLICY %I ON public.%I FOR ALL TO authenticated USING(owner_id=(SELECT auth.uid()) AND EXISTS(SELECT 1 FROM public.profiles WHERE id=(SELECT auth.uid()) AND role=''landlord'')) WITH CHECK(owner_id=(SELECT auth.uid()) AND EXISTS(SELECT 1 FROM public.profiles WHERE id=(SELECT auth.uid()) AND role=''landlord''))',t||'_owner_only',t);
 END LOOP;
END;$policies$;
-- This trigger function is not a callable registration endpoint.
REVOKE ALL ON FUNCTION public.create_profile() FROM PUBLIC,anon,authenticated;
