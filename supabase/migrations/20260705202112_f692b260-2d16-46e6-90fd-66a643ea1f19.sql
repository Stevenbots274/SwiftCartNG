
REVOKE EXECUTE ON FUNCTION public.approve_seller(uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.reject_seller(uuid, text) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.assign_role(uuid, app_role) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.revoke_role(uuid, app_role) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.mark_order_refunded(uuid, text) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.approve_seller(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.reject_seller(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.assign_role(uuid, app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.revoke_role(uuid, app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.mark_order_refunded(uuid, text) TO authenticated;
