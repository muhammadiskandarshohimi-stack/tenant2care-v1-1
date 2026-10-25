-- Keep tenant-account linking optional for landlord-managed, approved applications.
-- Preserve landlord ownership, approval, duplicate, amount and room-capacity guards.
DO $migration$
DECLARE
 definition text := pg_get_functiondef('public.phase4_create_tenancy(uuid,date,integer,numeric,numeric)'::regprocedure);
 account_guard text := ' IF v_tenant_id IS NULL THEN RAISE EXCEPTION ''This application is not linked to a tenant account''; END IF;';
 room_guard text := 'v_room.status NOT IN (''reserved'',''occupied'')';
BEGIN
 IF strpos(definition,account_guard)=0 OR strpos(definition,room_guard)=0 OR strpos(definition,' RETURN v_id;')=0 THEN
  RAISE EXCEPTION 'Tenancy creation function changed; review before updating';
 END IF;
 definition := replace(definition,account_guard,' -- Manual applicants retain a null tenant_id until an account is explicitly linked.');
 definition := replace(definition,room_guard,'v_room.status NOT IN (''available'',''reserved'',''occupied'')');
 definition := replace(definition,'The approved room must belong to you and be reserved','The approved room must belong to you and be available, reserved or occupied');
 definition := replace(definition,' RETURN v_id;',E' UPDATE public.rooms SET status=CASE WHEN status=''occupied'' THEN ''occupied'' ELSE ''reserved'' END WHERE id=v_room.id AND owner_id=(SELECT auth.uid());\n RETURN v_id;');
 EXECUTE definition;
END;
$migration$;
