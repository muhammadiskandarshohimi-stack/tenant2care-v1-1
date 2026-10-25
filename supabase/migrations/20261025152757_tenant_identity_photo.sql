ALTER TABLE public.applications ADD COLUMN IF NOT EXISTS identity_card_photo_path text;
CREATE UNIQUE INDEX IF NOT EXISTS applications_identity_photo_unique ON public.applications(identity_card_photo_path) WHERE identity_card_photo_path IS NOT NULL;
INSERT INTO storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
VALUES('tenant-identity-cards','tenant-identity-cards',false,3000000,ARRAY['image/jpeg'])
ON CONFLICT(id) DO UPDATE SET public=false,file_size_limit=3000000,allowed_mime_types=ARRAY['image/jpeg'];
CREATE POLICY identity_photo_insert ON storage.objects FOR INSERT TO authenticated WITH CHECK (
 bucket_id='tenant-identity-cards' AND (storage.foldername(name))[1]=(select auth.uid())::text
 AND name ~ '^[0-9a-f-]{36}/[0-9a-f-]{36}\.jpg$'
 AND EXISTS(SELECT 1 FROM public.profiles WHERE id=(select auth.uid()) AND role='tenant')
);
CREATE POLICY identity_photo_select ON storage.objects FOR SELECT TO authenticated USING (
 bucket_id='tenant-identity-cards' AND (
 (storage.foldername(name))[1]=(select auth.uid())::text OR EXISTS(
 SELECT 1 FROM public.applications a JOIN public.profiles p ON p.id=a.owner_id AND p.role='landlord'
 WHERE a.identity_card_photo_path=name AND a.owner_id=(select auth.uid())
 ))
);
CREATE POLICY identity_photo_remove_unsubmitted ON storage.objects FOR DELETE TO authenticated USING (
 bucket_id='tenant-identity-cards' AND (storage.foldername(name))[1]=(select auth.uid())::text
 AND NOT EXISTS(SELECT 1 FROM public.applications a WHERE a.identity_card_photo_path=name)
);
DO $migration$
DECLARE definition text:=pg_get_functiondef('public.phase3_submit_application(uuid,text,text,integer,text,text,text)'::regprocedure);
BEGIN
 IF strpos(definition,'p_identity_card_number text)')=0 OR strpos(definition,'phone,identity_card_number,address')=0 THEN RAISE EXCEPTION 'Submission definition changed; review first'; END IF;
 definition:=replace(definition,'p_identity_card_number text)','p_identity_card_number text, p_identity_card_photo_path text)');
 definition:=replace(definition,' IF p_identity_card_number IS NULL',E' IF p_identity_card_photo_path IS NULL OR split_part(p_identity_card_photo_path,''/'',1)<>auth.uid()::text OR NOT EXISTS(SELECT 1 FROM storage.objects WHERE bucket_id=''tenant-identity-cards'' AND name=p_identity_card_photo_path AND owner_id=auth.uid()::text) THEN RAISE EXCEPTION ''A saved identity card photo is required''; END IF;\n IF p_identity_card_number IS NULL');
 definition:=replace(definition,'phone,identity_card_number,address','phone,identity_card_photo_path,identity_card_number,address');
 definition:=replace(definition,'btrim(p_phone),regexp_replace','btrim(p_phone),p_identity_card_photo_path,regexp_replace');
 EXECUTE definition;
END $migration$;
-- Older signatures cannot be used to bypass the compulsory photo requirement.
REVOKE ALL ON FUNCTION public.phase3_submit_application(uuid,text,text,integer) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.phase3_submit_application(uuid,text,text,integer,text,text) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.phase3_submit_application(uuid,text,text,integer,text,text,text) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.phase3_submit_application(uuid,text,text,integer,text,text,text,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.phase3_submit_application(uuid,text,text,integer,text,text,text,text) TO authenticated;
