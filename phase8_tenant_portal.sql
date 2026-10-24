BEGIN;
CREATE OR REPLACE FUNCTION public.phase8_tenant_portal()
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $fn$
 WITH me AS (SELECT id FROM public.profiles WHERE id=(SELECT auth.uid()) AND role='tenant'),
 my_tenancies AS (SELECT t.* FROM public.tenancies t JOIN me ON me.id=t.tenant_id),
 totals AS (
  SELECT t.id,t.deposit_amount,
  CASE WHEN t.status IN ('active','ended') THEN t.monthly_rent*(SELECT count(*) FROM generate_series(0,t.term_months-1) AS s(n) WHERE (t.start_date+make_interval(months=>s.n))::date<=least((now() AT TIME ZONE 'Asia/Kuala_Lumpur')::date,t.end_date)) ELSE 0::numeric END AS due,
  coalesce(sum(p.amount) FILTER(WHERE p.payment_type='rent'),0) AS rp,coalesce(sum(p.amount) FILTER(WHERE p.payment_type='deposit'),0) AS dp
  FROM my_tenancies t LEFT JOIN public.payments p ON p.tenancy_id=t.id AND p.owner_id=t.owner_id AND p.status='paid' AND p.paid_at<(((now() AT TIME ZONE 'Asia/Kuala_Lumpur')::date+1)::timestamp AT TIME ZONE 'Asia/Kuala_Lumpur') GROUP BY t.id,t.deposit_amount,t.status,t.monthly_rent,t.start_date,t.end_date,t.term_months
 )
 SELECT jsonb_build_object(
 'as_of',(now() AT TIME ZONE 'Asia/Kuala_Lumpur')::date,
 'applications',coalesce((SELECT jsonb_agg(jsonb_build_object('id',a.id,'full_name',a.full_name,'status',a.status,'requested_term_months',a.requested_term_months,'room_name',r.name,'property_name',p.name,'created_at',a.created_at) ORDER BY a.created_at DESC)
  FROM public.applications a JOIN me ON me.id=a.applicant_user_id LEFT JOIN public.rooms r ON r.id=a.room_id AND r.owner_id=a.owner_id LEFT JOIN public.properties p ON p.id=a.property_id AND p.owner_id=a.owner_id),'[]'::jsonb),
 'tenancies',coalesce((SELECT jsonb_agg(jsonb_build_object('id',t.id,'status',t.status,'start_date',t.start_date,'end_date',t.end_date,'term_months',t.term_months,'monthly_rent',t.monthly_rent,'deposit_amount',t.deposit_amount,'room_name',r.name,'property_name',p.name) ORDER BY t.created_at DESC)
  FROM my_tenancies t LEFT JOIN public.rooms r ON r.id=t.room_id AND r.owner_id=t.owner_id LEFT JOIN public.applications a ON a.id=t.application_id AND a.owner_id=t.owner_id LEFT JOIN public.properties p ON p.id=a.property_id AND p.owner_id=t.owner_id),'[]'::jsonb),
 'payments',coalesce((SELECT jsonb_agg(jsonb_build_object('id',x.id,'tenancy_id',x.tenancy_id,'amount',x.amount,'payment_type',x.payment_type,'status',x.status,'reference',x.reference,'paid_at',x.paid_at,'receipt_number',CASE WHEN x.status='paid' THEN rc.receipt_number ELSE NULL END) ORDER BY x.paid_at DESC NULLS LAST)
  FROM public.payments x JOIN my_tenancies t ON t.id=x.tenancy_id AND t.owner_id=x.owner_id LEFT JOIN public.receipts rc ON rc.payment_id=x.id AND rc.owner_id=x.owner_id),'[]'::jsonb),
 'balances',coalesce((SELECT jsonb_agg(jsonb_build_object('tenancy_id',id,'rent_due',due,'rent_paid',rp,'rent_balance',greatest(due-rp,0),'rent_credit',greatest(rp-due,0),'deposit_agreed',deposit_amount,'deposit_paid',dp,'deposit_remaining',greatest(deposit_amount-dp,0),'deposit_excess',greatest(dp-deposit_amount,0))) FROM totals),'[]'::jsonb)
 );
$fn$;

CREATE OR REPLACE FUNCTION public.phase8_tenant_receipt(p_payment_id uuid)
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $fn$
 SELECT jsonb_build_object('receipt_number',rc.receipt_number,'amount',p.amount,'payment_type',p.payment_type,'reference',p.reference,
 'paid_on',(p.paid_at AT TIME ZONE 'Asia/Kuala_Lumpur')::date,'tenant_name',coalesce(a.full_name,pr.display_name,'Tenant'),'room_name',r.name,'property_name',prop.name)
 FROM public.payments p JOIN public.tenancies t ON t.id=p.tenancy_id AND t.owner_id=p.owner_id
 JOIN public.profiles pr ON pr.id=t.tenant_id AND pr.id=(SELECT auth.uid()) AND pr.role='tenant'
 JOIN public.receipts rc ON rc.payment_id=p.id AND rc.owner_id=p.owner_id
 LEFT JOIN public.applications a ON a.id=t.application_id AND a.owner_id=t.owner_id
 LEFT JOIN public.rooms r ON r.id=t.room_id AND r.owner_id=t.owner_id
 LEFT JOIN public.properties prop ON prop.id=a.property_id AND prop.owner_id=t.owner_id
 WHERE p.id=p_payment_id AND p.status='paid';
$fn$;
REVOKE ALL ON FUNCTION public.phase8_tenant_portal() FROM PUBLIC,anon;
REVOKE ALL ON FUNCTION public.phase8_tenant_receipt(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.phase8_tenant_portal() TO authenticated;
GRANT EXECUTE ON FUNCTION public.phase8_tenant_receipt(uuid) TO authenticated;
COMMIT;
