
-- Drop the overly permissive update policy
DROP POLICY IF EXISTS "Public can update hub_share status via token" ON public.hub_shares;

-- Replace with a tighter policy: anon can only update status and viewed_at
CREATE POLICY "Public can update hub_share viewed status"
ON public.hub_shares
FOR UPDATE
TO anon
USING (token IS NOT NULL)
WITH CHECK (status = 'viewed');
