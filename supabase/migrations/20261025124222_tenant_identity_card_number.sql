ALTER TABLE public.applications
 ADD COLUMN IF NOT EXISTS identity_card_number text
 CHECK (identity_card_number ~ '^[0-9]{12}$');
-- New registration signature; older clients remain compatible.
DO $migration$
DECLARE
 definition text := pg_get_functiondef('public.phase3_submit_application(uuid,text,text,integer,text,text)'::regprocedure);
BEGIN
 IF strpos(definition,'p_working_address text)')=0 OR strpos(definition,'phone,address,working_address')=0 OR strpos(definition,'btrim(p_phone),btrim(p_address)')=0 OR strpos(definition,' IF p_address IS NULL')=0 THEN
  RAISE EXCEPTION 'Application submission changed; review before updating';
 END IF;
 definition:=replace(definition,'p_working_address text)','p_working_address text, p_identity_card_number text)');
 definition:=replace(definition,' IF p_address IS NULL',E' IF p_identity_card_number IS NULL OR regexp_replace(p_identity_card_number,''[-[:space:]]'','''',''g'') !~ ''^[0-9]{12}$'' THEN RAISE EXCEPTION ''Enter a valid 12-digit identity card number''; END IF;\n IF p_address IS NULL');
 definition:=replace(definition,'phone,address,working_address','phone,identity_card_number,address,working_address');
 definition:=replace(definition,'btrim(p_phone),btrim(p_address)','btrim(p_phone),regexp_replace(p_identity_card_number,''[-[:space:]]'','''',''g''),btrim(p_address)');
 EXECUTE definition;
END;
$migration$;
REVOKE ALL ON FUNCTION public.phase3_submit_application(uuid,text,text,integer,text,text,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.phase3_submit_application(uuid,text,text,integer,text,text,text) TO authenticated;
