-- Restrict magic link functions to only be callable by service_role
-- This prevents authenticated users from directly calling these functions via RPC
-- The accountant-portal-access edge function uses service_role and will continue to work

-- Revoke execute permissions from authenticated and anon roles
REVOKE EXECUTE ON FUNCTION public.validate_magic_link_token(text) FROM authenticated, anon;
REVOKE EXECUTE ON FUNCTION public.update_magic_link_access(uuid) FROM authenticated, anon;

-- Grant execute only to service_role (used by edge functions)
GRANT EXECUTE ON FUNCTION public.validate_magic_link_token(text) TO service_role;
GRANT EXECUTE ON FUNCTION public.update_magic_link_access(uuid) TO service_role;