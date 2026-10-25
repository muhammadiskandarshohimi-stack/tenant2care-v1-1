-- Document access is assigned by the submission RPC, never by editable application fields.
CREATE TABLE public.tenant_identity_documents (
 application_id uuid PRIMARY KEY REFERENCES public.applications(id) ON DELETE CASCADE,
 storage_path text UNIQUE NOT NULL,
 applicant_user_id uuid NOT NULL REFERENCES auth.users(id),
 owner_id uuid NOT NULL REFERENCES auth.users(id),
 created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.tenant_identity_documents ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.tenant_identity_documents FROM anon,authenticated;
GRANT SELECT ON public.tenant_identity_documents TO authenticated;
CREATE POLICY identity_document_read ON public.tenant_identity_documents FOR SELECT TO authenticated USING (
 applicant_user_id=(select auth.uid()) OR (owner_id=(select auth.uid()) AND EXISTS(SELECT 1 FROM public.profiles WHERE id=(select auth.uid()) AND role='landlord'))
);
DROP POLICY identity_photo_select ON storage.objects;
DROP POLICY identity_photo_remove_unsubmitted ON storage.objects;
CREATE POLICY identity_photo_select ON storage.objects FOR SELECT TO authenticated USING (
 bucket_id='tenant-identity-cards' AND (
 (storage.foldername(name))[1]=(select auth.uid())::text OR EXISTS(
 SELECT 1 FROM public.tenant_identity_documents d JOIN public.profiles p ON p.id=d.owner_id AND p.role='landlord'
 WHERE d.storage_path=name AND d.owner_id=(select auth.uid())
 ))
);
CREATE POLICY identity_photo_remove_unsubmitted ON storage.objects FOR DELETE TO authenticated USING (
 bucket_id='tenant-identity-cards' AND (storage.foldername(name))[1]=(select auth.uid())::text
 AND NOT EXISTS(SELECT 1 FROM public.tenant_identity_documents d WHERE d.storage_path=name)
);
DO $migration$
DECLARE definition text:=pg_get_functiondef('public.phase3_submit_application(uuid,text,text,integer,text,text,text,text)'::regprocedure);
BEGIN
 IF strpos(definition,' RETURN v_id;')=0 THEN RAISE EXCEPTION 'Submission definition changed';END IF;
 definition:=replace(definition,' RETURN v_id;',E' INSERT INTO public.tenant_identity_documents(application_id,storage_path,applicant_user_id,owner_id) VALUES(v_id,p_identity_card_photo_path,auth.uid(),v_room.owner_id);\n RETURN v_id;');
 EXECUTE definition;
END $migration$;
