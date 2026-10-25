-- Preserve the current room capacity, role, ownership and duplicate checks.
-- Permit a confirmed phone identity in addition to a confirmed email identity.
DO $migration$
DECLARE
  current_definition text;
  old_check text := E' SELECT email INTO v_email FROM auth.users WHERE id=auth.uid() AND email_confirmed_at IS NOT NULL;\n IF v_email IS NULL THEN RAISE EXCEPTION ''Confirm your email first''; END IF;';
  new_check text := E' SELECT CASE WHEN email_confirmed_at IS NOT NULL THEN NULLIF(email,'''') ELSE NULL END INTO v_email FROM auth.users WHERE id=auth.uid();\n IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id=auth.uid() AND ((NULLIF(email,'''') IS NOT NULL AND email_confirmed_at IS NOT NULL) OR (NULLIF(phone,'''') IS NOT NULL AND phone_confirmed_at IS NOT NULL))) THEN RAISE EXCEPTION ''Verify your email or phone number first''; END IF;';
BEGIN
  SELECT pg_get_functiondef('public.phase3_submit_application(uuid,text,text,integer)'::regprocedure) INTO current_definition;
  IF strpos(current_definition, old_check) = 0 THEN
    RAISE EXCEPTION 'Application verification check has changed; review before updating';
  END IF;
  EXECUTE replace(current_definition, old_check, new_check);
END;
$migration$;
