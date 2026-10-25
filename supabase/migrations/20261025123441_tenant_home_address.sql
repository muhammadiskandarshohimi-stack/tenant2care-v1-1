ALTER TABLE public.applications
 ADD COLUMN IF NOT EXISTS address text CHECK (char_length(address)<=1000),
 ADD COLUMN IF NOT EXISTS working_address text CHECK (char_length(working_address)<=1000);
-- Extend the current submission function, keeping its identity, role, ownership,
-- verification, capacity and duplicate checks. Keep the old signature for old clients.
DO $migration$
DECLARE
 definition text := pg_get_functiondef('public.phase3_submit_application(uuid,text,text,integer)'::regprocedure);
 old_signature text := 'p_phone text, p_term integer)';
 old_columns text := 'full_name,email,phone,requested_term_months';
 old_values text := 'btrim(p_full_name),v_email,btrim(p_phone),p_term';
 validation_point text := ' IF p_full_name IS NULL';
BEGIN
 IF strpos(definition,old_signature)=0 OR strpos(definition,old_columns)=0 OR strpos(definition,old_values)=0 OR strpos(definition,validation_point)=0 THEN
  RAISE EXCEPTION 'Application submission changed; review before updating';
 END IF;
 definition := replace(definition,old_signature,'p_phone text, p_term integer, p_address text, p_working_address text)');
 definition := replace(definition,validation_point,E' IF p_address IS NULL OR char_length(btrim(p_address))<5 OR char_length(p_address)>1000 THEN RAISE EXCEPTION ''Enter a full home address (5 to 1000 characters)''; END IF;\n IF char_length(p_working_address)>1000 THEN RAISE EXCEPTION ''Working address must not exceed 1000 characters''; END IF;\n IF p_full_name IS NULL');
 definition := replace(definition,old_columns,'full_name,email,phone,address,working_address,requested_term_months');
 definition := replace(definition,old_values,'btrim(p_full_name),v_email,btrim(p_phone),btrim(p_address),NULLIF(btrim(p_working_address),''''),p_term');
 EXECUTE definition;
END;
$migration$;
REVOKE ALL ON FUNCTION public.phase3_submit_application(uuid,text,text,integer,text,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.phase3_submit_application(uuid,text,text,integer,text,text) TO authenticated;
