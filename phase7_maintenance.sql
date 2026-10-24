BEGIN;
ALTER TABLE public.maintenance_tickets ADD COLUMN IF NOT EXISTS reporter_user_id uuid REFERENCES auth.users(id),
 ADD COLUMN IF NOT EXISTS request_id uuid, ADD COLUMN IF NOT EXISTS last_update text,
 ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();
CREATE UNIQUE INDEX IF NOT EXISTS phase7_report_request ON public.maintenance_tickets(reporter_user_id,request_id) WHERE request_id IS NOT NULL;
ALTER TABLE public.expenses ADD COLUMN IF NOT EXISTS maintenance_summary boolean NOT NULL DEFAULT false;
CREATE UNIQUE INDEX IF NOT EXISTS phase7_ticket_cost ON public.expenses(ticket_id) WHERE maintenance_summary AND ticket_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.phase7_report_rooms()
RETURNS TABLE(room_id uuid,room_name text,property_name text) LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $fn$
 SELECT r.id,r.name::text,p.name::text FROM public.rooms r JOIN public.properties p ON p.id=r.property_id AND p.owner_id=r.owner_id
 WHERE (SELECT auth.uid()) IS NOT NULL AND (
 (r.owner_id=(SELECT auth.uid()) AND EXISTS(SELECT 1 FROM public.profiles WHERE id=(SELECT auth.uid()) AND role='landlord'))
 OR EXISTS(SELECT 1 FROM public.tenancies t JOIN public.profiles pr ON pr.id=t.tenant_id AND pr.role='tenant'
 WHERE t.room_id=r.id AND t.owner_id=r.owner_id AND t.tenant_id=(SELECT auth.uid()) AND t.status IN ('draft','active') AND t.end_date>=(now() AT TIME ZONE 'Asia/Kuala_Lumpur')::date)
 ) ORDER BY p.name,r.name;
$fn$;

CREATE OR REPLACE FUNCTION public.phase7_create_report(p_room_id uuid,p_title text,p_description text,p_priority text,p_request_id uuid)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $fn$
DECLARE r public.rooms%ROWTYPE; old public.maintenance_tickets%ROWTYPE; caller_role text; result uuid;
BEGIN
 SELECT role INTO caller_role FROM public.profiles WHERE id=(SELECT auth.uid());
 IF (SELECT auth.uid()) IS NULL OR caller_role IS NULL OR caller_role NOT IN ('landlord','tenant') THEN RAISE EXCEPTION 'Not authorized'; END IF;
 IF p_request_id IS NULL OR p_title IS NULL OR length(btrim(p_title))<3 OR length(p_title)>160 OR p_description IS NULL OR length(btrim(p_description))<10 OR length(p_description)>5000 OR p_priority IS NULL OR p_priority NOT IN ('low','normal','urgent') THEN RAISE EXCEPTION 'Enter a title, detailed description and valid priority'; END IF;
 SELECT * INTO old FROM public.maintenance_tickets WHERE reporter_user_id=(SELECT auth.uid()) AND request_id=p_request_id;
 IF FOUND THEN
  IF old.room_id IS DISTINCT FROM p_room_id OR old.title IS DISTINCT FROM btrim(p_title) OR old.description IS DISTINCT FROM btrim(p_description) OR old.priority IS DISTINCT FROM p_priority THEN RAISE EXCEPTION 'This request was already used with different report details'; END IF;
  RETURN old.id;
 END IF;
 SELECT * INTO r FROM public.rooms WHERE id=p_room_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Room not available for reporting'; END IF;
 IF caller_role='landlord' AND r.owner_id IS DISTINCT FROM (SELECT auth.uid()) THEN RAISE EXCEPTION 'Not authorized'; END IF;
 IF caller_role='tenant' AND NOT EXISTS(SELECT 1 FROM public.tenancies t WHERE t.room_id=r.id AND t.owner_id=r.owner_id AND t.tenant_id=(SELECT auth.uid()) AND t.status IN ('draft','active') AND t.end_date>=(now() AT TIME ZONE 'Asia/Kuala_Lumpur')::date) THEN RAISE EXCEPTION 'You may report only for your assigned room'; END IF;
 INSERT INTO public.maintenance_tickets(owner_id,room_id,tenant_id,title,description,priority,status,reporter_user_id,request_id,updated_at)
 VALUES(r.owner_id,r.id,CASE WHEN caller_role='tenant' THEN (SELECT auth.uid()) ELSE NULL END,btrim(p_title),btrim(p_description),p_priority,'open',(SELECT auth.uid()),p_request_id,now()) RETURNING id INTO result;
 RETURN result;
END;$fn$;

CREATE OR REPLACE FUNCTION public.phase7_list_reports()
RETURNS TABLE(id uuid,room_id uuid,room_name text,title text,description text,priority text,status text,last_update text,updated_at timestamptz,created_at timestamptz,reporter text,repair_cost numeric,cost_incurred_on date,total_repair_cost numeric)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $fn$
 SELECT m.id,m.room_id,r.name::text,m.title,m.description,m.priority,m.status,m.last_update,m.updated_at,m.created_at,
 CASE WHEN m.reporter_user_id=m.owner_id THEN 'Landlord' WHEN m.reporter_user_id IS NOT NULL THEN 'Tenant' ELSE 'Unspecified' END,
 CASE WHEN m.owner_id=(SELECT auth.uid()) THEN e.amount ELSE NULL END,
 CASE WHEN m.owner_id=(SELECT auth.uid()) THEN e.incurred_on ELSE NULL END,
 CASE WHEN m.owner_id=(SELECT auth.uid()) THEN (SELECT coalesce(sum(x.amount),0) FROM public.expenses x WHERE x.ticket_id=m.id AND x.owner_id=m.owner_id) ELSE NULL END
 FROM public.maintenance_tickets m LEFT JOIN public.rooms r ON r.id=m.room_id AND r.owner_id=m.owner_id
 LEFT JOIN public.expenses e ON e.ticket_id=m.id AND e.owner_id=m.owner_id AND e.maintenance_summary
 WHERE (SELECT auth.uid()) IS NOT NULL AND (m.owner_id=(SELECT auth.uid()) OR m.reporter_user_id=(SELECT auth.uid()))
 ORDER BY m.created_at DESC;
$fn$;

CREATE OR REPLACE FUNCTION public.phase7_update_report(p_ticket_id uuid,p_status text,p_update text,p_repair_cost numeric,p_incurred_on date)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $fn$
DECLARE m public.maintenance_tickets%ROWTYPE; property uuid;
BEGIN
 IF (SELECT auth.uid()) IS NULL OR NOT EXISTS(SELECT 1 FROM public.profiles WHERE id=(SELECT auth.uid()) AND role='landlord') THEN RAISE EXCEPTION 'Not authorized'; END IF;
 IF p_status IS NULL OR p_status NOT IN ('open','in_progress','resolved','closed') OR length(coalesce(p_update,''))>2000 THEN RAISE EXCEPTION 'Select a valid status and keep the update within 2000 characters'; END IF;
 IF p_repair_cost IS NOT NULL AND (NOT(p_repair_cost>=0 AND p_repair_cost<=100000000) OR p_repair_cost<>round(p_repair_cost,2) OR p_incurred_on IS NULL OR p_incurred_on<DATE '2000-01-01' OR p_incurred_on>(now() AT TIME ZONE 'Asia/Kuala_Lumpur')::date) THEN RAISE EXCEPTION 'Enter a non-negative repair cost and a valid incurred date'; END IF;
 SELECT * INTO m FROM public.maintenance_tickets WHERE id=p_ticket_id FOR UPDATE;
 IF NOT FOUND OR m.owner_id IS DISTINCT FROM (SELECT auth.uid()) THEN RAISE EXCEPTION 'Not authorized'; END IF;
 SELECT property_id INTO property FROM public.rooms WHERE id=m.room_id AND owner_id=m.owner_id;
 IF p_repair_cost IS NOT NULL THEN
  UPDATE public.expenses SET amount=p_repair_cost,incurred_on=p_incurred_on,description='Repair cost: '||m.title
   WHERE ticket_id=m.id AND owner_id=m.owner_id AND maintenance_summary;
  IF NOT FOUND THEN
   INSERT INTO public.expenses(owner_id,property_id,ticket_id,category,amount,description,incurred_on,maintenance_summary)
   VALUES(m.owner_id,property,m.id,'repair',p_repair_cost,'Repair cost: '||m.title,p_incurred_on,true);
  END IF;
 END IF;
 UPDATE public.maintenance_tickets SET status=p_status,last_update=coalesce(p_update,''),updated_at=now() WHERE maintenance_tickets.id=m.id;
END;$fn$;
REVOKE ALL ON FUNCTION public.phase7_report_rooms() FROM PUBLIC,anon;
REVOKE ALL ON FUNCTION public.phase7_create_report(uuid,text,text,text,uuid) FROM PUBLIC,anon;
REVOKE ALL ON FUNCTION public.phase7_list_reports() FROM PUBLIC,anon;
REVOKE ALL ON FUNCTION public.phase7_update_report(uuid,text,text,numeric,date) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.phase7_report_rooms() TO authenticated;
GRANT EXECUTE ON FUNCTION public.phase7_create_report(uuid,text,text,text,uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.phase7_list_reports() TO authenticated;
GRANT EXECUTE ON FUNCTION public.phase7_update_report(uuid,text,text,numeric,date) TO authenticated;
COMMIT;
