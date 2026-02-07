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

// UUID validation regex
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Validate UUID format
function isValidUUID(id: string | undefined): boolean {
  return id ? UUID_REGEX.test(id) : false;
}

// Sanitize and validate comment text
function sanitizeComment(text: string | undefined, maxLength: number = 5000): string {
  if (!text) return '';
  // Trim and limit length
  return String(text).trim().substring(0, maxLength);
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

    if (!token || typeof token !== 'string' || token.length < 10 || token.length > 100) {
      return new Response(
        JSON.stringify({ error: 'Invalid request', code: 'INVALID_TOKEN' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate the magic link token using SECURITY DEFINER function
    const { data: linkData, error: linkError } = await supabase
      .rpc('validate_magic_link_token', { _token: token });

    if (linkError) {
      console.error('Token validation error');
      return new Response(
        JSON.stringify({ error: 'Unable to validate access', code: 'VALIDATION_ERROR' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!linkData || linkData.length === 0 || !linkData[0].is_valid) {
      console.log('Access denied: invalid or expired link');
      return new Response(
        JSON.stringify({ error: 'Link expired or invalid', authorized: false, code: 'LINK_INVALID' }),
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
        console.error('Error fetching packages');
        return new Response(
          JSON.stringify({ error: 'Unable to retrieve data', code: 'DATA_FETCH_ERROR' }),
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

      // Fetch general invoices (not linked to any package) for this month
      const { data: generalInvoicesData } = await supabase
        .from('invoices')
        .select('*')
        .is('package_id', null)
        .gte('invoice_date', startDate)
        .lt('invoice_date', endDate);

      const generalInvoices = generalInvoicesData || [];

      // Fetch ALL bank transactions for this month (regardless of package)
      const { data: txnData } = await supabase
        .from('bank_transactions')
        .select('*')
        .gte('transaction_date', startDate)
        .lt('transaction_date', endDate)
        .order('transaction_date', { ascending: false });

      const transactions = txnData || [];

      // Fetch invoice list imports for this month
      const { data: invoiceListImportsData } = await supabase
        .from('invoice_list_imports')
        .select('*')
        .eq('period_month', monthYear)
        .order('upload_date', { ascending: false });

      const invoiceListImports = invoiceListImportsData || [];

      // Fetch invoice list items for these imports
      let invoiceListItems: any[] = [];
      const importIds = invoiceListImports.map(i => i.id);
      if (importIds.length > 0) {
        const { data: itemsData } = await supabase
          .from('invoice_list_items')
          .select('*')
          .in('import_id', importIds)
          .order('invoice_date', { ascending: false });
        invoiceListItems = itemsData || [];
      }

      // Combine packages with their invoices
      const packagesWithInvoices = (packages || []).map(pkg => ({
        ...pkg,
        invoices: invoices.filter(inv => inv.package_id === pkg.id)
      }));

      // Combine imports with their items
      const invoiceListImportsWithItems = invoiceListImports.map(imp => ({
        ...imp,
        items: invoiceListItems.filter(item => item.import_id === imp.id)
      }));

      return new Response(
        JSON.stringify({
          authorized: true,
          monthYear,
          packages: packagesWithInvoices,
          transactions,
          generalInvoices,
          invoiceListImports: invoiceListImportsWithItems
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'post_comment') {
      const { invoiceId, commentText, isDoubt } = body;

      // Validate invoice ID format
      if (!invoiceId || !isValidUUID(invoiceId)) {
        return new Response(
          JSON.stringify({ error: 'Invalid invoice reference', code: 'INVALID_INVOICE_ID' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Validate and sanitize comment text
      const sanitizedComment = sanitizeComment(commentText);
      if (!sanitizedComment || sanitizedComment.length < 1) {
        return new Response(
          JSON.stringify({ error: 'Comment text is required', code: 'MISSING_COMMENT' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (sanitizedComment.length > 5000) {
        return new Response(
          JSON.stringify({ error: 'Comment exceeds maximum length', code: 'COMMENT_TOO_LONG' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Insert comment
      const { error: commentError } = await supabase
        .from('invoice_comments')
        .insert({
          invoice_id: invoiceId,
          comment_text: sanitizedComment,
          is_doubt: Boolean(isDoubt)
        });

      if (commentError) {
        console.error('Error posting comment');
        return new Response(
          JSON.stringify({ error: 'Unable to save comment', code: 'COMMENT_SAVE_ERROR' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Create notification for staff (don't fail if this errors)
      try {
        await supabase
          .from('notifications')
          .insert({
            type: isDoubt ? 'doubt' : 'comment',
            title: isDoubt ? 'Αμφισβήτηση από Λογιστή' : 'Νέο Σχόλιο Λογιστή',
            message: sanitizedComment.substring(0, 200), // Limit notification message
            link_url: `/packages?invoice=${invoiceId}`
          });
      } catch (notifError) {
        console.error('Notification creation failed');
        // Don't fail the request for notification error
      }

      return new Response(
        JSON.stringify({ success: true }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Invalid action', code: 'INVALID_ACTION' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Portal access error');
    return new Response(
      JSON.stringify({ error: 'An unexpected error occurred', code: 'INTERNAL_ERROR' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
