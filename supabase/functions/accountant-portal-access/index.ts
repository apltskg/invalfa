import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface PortalRequest {
  token: string;
  action?: 'validate' | 'get_data' | 'post_comment';
  invoiceId?: string;
  commentText?: string;
  isDoubt?: boolean;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    // Use service role client for server-side operations
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body: PortalRequest = await req.json();
    const { token, action = 'validate' } = body;

    if (!token) {
      return new Response(
        JSON.stringify({ error: 'Token is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate the magic link token using SECURITY DEFINER function
    const { data: linkData, error: linkError } = await supabase
      .rpc('validate_magic_link_token', { _token: token });

    if (linkError) {
      console.error('Token validation error:', linkError);
      return new Response(
        JSON.stringify({ error: 'Token validation failed' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!linkData || linkData.length === 0 || !linkData[0].is_valid) {
      console.log('Invalid or expired token:', token.substring(0, 8) + '...');
      return new Response(
        JSON.stringify({ error: 'Invalid or expired link', authorized: false }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const validatedLink = linkData[0];
    const monthYear = validatedLink.month_year;

    // Log access
    await supabase.rpc('update_magic_link_access', { _link_id: validatedLink.id });

    // Handle different actions
    if (action === 'validate') {
      return new Response(
        JSON.stringify({ 
          authorized: true, 
          monthYear,
          expiresAt: validatedLink.expires_at
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'get_data') {
      // Calculate date range for the month
      const [year, month] = monthYear.split('-');
      const startDate = `${monthYear}-01`;
      const nextMonth = parseInt(month) === 12 
        ? `${parseInt(year) + 1}-01` 
        : `${year}-${String(parseInt(month) + 1).padStart(2, '0')}`;
      const endDate = `${nextMonth}-01`;

      // Fetch packages for this month
      const { data: packages, error: pkgError } = await supabase
        .from('packages')
        .select('*')
        .gte('start_date', startDate)
        .lt('start_date', endDate);

      if (pkgError) {
        console.error('Error fetching packages:', pkgError);
        return new Response(
          JSON.stringify({ error: 'Failed to fetch data' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Get package IDs
      const packageIds = (packages || []).map(p => p.id);

      // Fetch invoices for these packages
      let invoices: any[] = [];
      if (packageIds.length > 0) {
        const { data: invData } = await supabase
          .from('invoices')
          .select('*')
          .in('package_id', packageIds);
        invoices = invData || [];
      }

      // Fetch bank transactions for these packages
      let transactions: any[] = [];
      if (packageIds.length > 0) {
        const { data: txnData } = await supabase
          .from('bank_transactions')
          .select('*')
          .in('package_id', packageIds);
        transactions = txnData || [];
      }

      // Combine packages with their invoices
      const packagesWithInvoices = (packages || []).map(pkg => ({
        ...pkg,
        invoices: invoices.filter(inv => inv.package_id === pkg.id)
      }));

      return new Response(
        JSON.stringify({
          authorized: true,
          monthYear,
          packages: packagesWithInvoices,
          transactions
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'post_comment') {
      const { invoiceId, commentText, isDoubt } = body;

      if (!invoiceId || !commentText) {
        return new Response(
          JSON.stringify({ error: 'Invoice ID and comment text are required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Insert comment
      const { error: commentError } = await supabase
        .from('invoice_comments')
        .insert({
          invoice_id: invoiceId,
          comment_text: commentText,
          is_doubt: isDoubt || false
        });

      if (commentError) {
        console.error('Error posting comment:', commentError);
        return new Response(
          JSON.stringify({ error: 'Failed to post comment' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Create notification for staff
      const { error: notifError } = await supabase
        .from('notifications')
        .insert({
          type: isDoubt ? 'doubt' : 'comment',
          title: isDoubt ? 'Αμφισβήτηση από Λογιστή' : 'Νέο Σχόλιο Λογιστή',
          message: commentText,
          link_url: `/packages?invoice=${invoiceId}`
        });

      if (notifError) {
        console.error('Error creating notification:', notifError);
        // Don't fail the request for notification error
      }

      return new Response(
        JSON.stringify({ success: true }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Invalid action' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Accountant portal error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
