BEGIN;
-- Configure only the two shared rooms requested for this owner's property.
DO $$ DECLARE changed integer;
BEGIN
 UPDATE public.rooms r SET capacity=2
 FROM public.properties p,auth.users u
 WHERE r.property_id=p.id AND r.owner_id=p.owner_id AND r.owner_id=u.id
 AND u.email='muhammadiskandarshohimi@gmail.com'
 AND p.name='SCIENTEX KLEBANG SEROJA' AND r.name IN ('Room 1','Room 2');
 GET DIAGNOSTICS changed=ROW_COUNT;
 IF changed<>2 THEN RAISE EXCEPTION 'Expected exactly Room 1 and Room 2; found %',changed; END IF;
 UPDATE public.rooms r SET status=CASE
 WHEN EXISTS(SELECT 1 FROM public.tenancies t WHERE t.room_id=r.id AND t.status='active') THEN 'occupied'
 WHEN public.room_allocated_places(r.id)>0 THEN 'reserved' ELSE 'available' END
 FROM public.properties p,auth.users u
 WHERE r.property_id=p.id AND r.owner_id=p.owner_id AND r.owner_id=u.id
 AND u.email='muhammadiskandarshohimi@gmail.com'
 AND p.name='SCIENTEX KLEBANG SEROJA' AND r.name IN ('Room 1','Room 2') AND r.status<>'inactive';
END;$$;
COMMIT;
