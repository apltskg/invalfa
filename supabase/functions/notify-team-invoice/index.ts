import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Auth check
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: claims, error: claimsErr } = await supabase.auth.getClaims(
      authHeader.replace("Bearer ", "")
    );
    if (claimsErr || !claims?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { invoiceId } = await req.json();
    if (!invoiceId || typeof invoiceId !== "string") {
      return new Response(JSON.stringify({ error: "Missing invoiceId" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch invoice details using service role
    const serviceClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: invoice, error: invoiceErr } = await serviceClient
      .from("invoices")
      .select("merchant, amount, invoice_date, file_name, supplier_id, suppliers(name)")
      .eq("id", invoiceId)
      .single();

    if (invoiceErr || !invoice) {
      return new Response(JSON.stringify({ error: "Invoice not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch agency settings
    const { data: agency } = await serviceClient
      .from("agency_settings")
      .select("company_name, email, phone")
      .single();

    const companyName = agency?.company_name || "TravelDocs";
    const siteUrl = req.headers.get("origin") || "https://invalfa.lovable.app";
    
    const supplier = invoice.suppliers as any;
    const supplierName = supplier?.name || invoice.merchant || "Άγνωστος Προμηθευτής";
    const amountStr = invoice?.amount ? `€${Number(invoice.amount).toFixed(2)}` : "";
    const invoiceUrl = `${siteUrl}/general-expenses`;

    // Send email via Resend
    const resendKey = Deno.env.get("RESEND_API_KEY");
    if (!resendKey) {
      return new Response(JSON.stringify({ error: "Email service not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Νέο Παραστατικό Προμηθευτή</title>
</head>
<body style="margin: 0; padding: 0; background-color: #ffffff; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;">
  <div style="max-width: 600px; margin: 0 auto; background: #ffffff;">
    
    <!-- Header -->
    <div style="background: linear-gradient(135deg, #059669 0%, #10b981 100%); padding: 40px 32px; text-align: center;">
      <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 600; letter-spacing: -0.5px;">
        ${companyName}
      </h1>
      <p style="margin: 8px 0 0; color: rgba(255,255,255,0.9); font-size: 15px; font-weight: 400;">
        📥 Νέο παραστατικό προμηθευτή
      </p>
    </div>

    <!-- Main Content -->
    <div style="padding: 40px 32px;">
      
      <!-- Alert -->
      <div style="background: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 12px; padding: 20px 24px; margin-bottom: 32px;">
        <div style="display: flex; align-items: center;">
          <div style="width: 40px; height: 40px; background: #059669; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin-right: 16px; flex-shrink: 0;">
            <span style="color: white; font-size: 20px;">📋</span>
          </div>
          <div>
            <h2 style="margin: 0 0 4px; color: #065f46; font-size: 18px; font-weight: 600;">
              Νέο Παραστατικό Ανέβηκε!
            </h2>
            <p style="margin: 0; color: #047857; font-size: 14px;">
              Ένα νέο παραστατικό προμηθευτή έχει προστεθεί στην πλατφόρμα και περιμένει επεξεργασία.
            </p>
          </div>
        </div>
      </div>

      <!-- Invoice Details -->
      <div style="background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 12px; padding: 24px; margin-bottom: 32px;">
        <h3 style="margin: 0 0 20px; color: #1f2937; font-size: 16px; font-weight: 600; border-bottom: 1px solid #e5e7eb; padding-bottom: 12px;">
          📄 Στοιχεία Παραστατικού
        </h3>
        
        <div style="space-y: 12px;">
          <div style="margin-bottom: 12px;">
            <span style="color: #6b7280; font-size: 13px; display: inline-block; width: 100px;">Προμηθευτής:</span>
            <span style="color: #1f2937; font-size: 14px; font-weight: 500;">${supplierName}</span>
          </div>
          
          ${amountStr ? `
          <div style="margin-bottom: 12px;">
            <span style="color: #6b7280; font-size: 13px; display: inline-block; width: 100px;">Ποσό:</span>
            <span style="color: #dc2626; font-size: 16px; font-weight: 600;">${amountStr}</span>
          </div>
          ` : ""}
          
          ${invoice?.invoice_date ? `
          <div style="margin-bottom: 12px;">
            <span style="color: #6b7280; font-size: 13px; display: inline-block; width: 100px;">Ημερομηνία:</span>
            <span style="color: #1f2937; font-size: 14px;">${invoice.invoice_date}</span>
          </div>
          ` : ""}
          
          <div>
            <span style="color: #6b7280; font-size: 13px; display: inline-block; width: 100px;">Αρχείο:</span>
            <span style="color: #1f2937; font-size: 14px;">${invoice.file_name}</span>
          </div>
        </div>
      </div>

      <!-- Action Steps -->
      <div style="background: #fff7ed; border: 1px solid #fed7aa; border-radius: 12px; padding: 24px; margin-bottom: 32px;">
        <h3 style="margin: 0 0 16px; color: #9a3412; font-size: 16px; font-weight: 600;">
          ⚡ Επόμενα Βήματα
        </h3>
        <ul style="margin: 0; padding-left: 20px; color: #a16207; font-size: 14px; line-height: 1.6;">
          <li style="margin-bottom: 8px;">Έλεγχος και επαλήθευση των στοιχείων του παραστατικού</li>
          <li style="margin-bottom: 8px;">Κατηγοριοποίηση και συσχέτιση με πακέτο/έξοδο</li>
          <li style="margin-bottom: 8px;">Προσθήκη σημειώσεων αν χρειάζονται</li>
          <li>Έγκριση για συμπερίληψη στα μηνιαία reports</li>
        </ul>
      </div>

      <!-- CTA Button -->
      <div style="text-align: center; margin-bottom: 32px;">
        <a href="${invoiceUrl}" style="display: inline-block; background: linear-gradient(135deg, #059669 0%, #10b981 100%); color: #ffffff; text-decoration: none; padding: 16px 32px; border-radius: 12px; font-size: 16px; font-weight: 600; box-shadow: 0 4px 12px rgba(5, 150, 105, 0.3);">
          🚀 Επεξεργασία Παραστατικού
        </a>
      </div>

    </div>

    <!-- Footer -->
    <div style="background: #f9fafb; padding: 24px 32px; text-align: center; border-top: 1px solid #e5e7eb;">
      <p style="margin: 0 0 8px; color: #374151; font-size: 14px; font-weight: 500;">
        ${companyName} - Αυτοματοποιημένη Ειδοποίηση
      </p>
      <p style="margin: 0; color: #9ca3af; font-size: 11px; line-height: 1.4;">
        Αυτό το email στάλθηκε αυτόματα όταν προστέθηκε νέο παραστατικό στην πλατφόρμα.<br>
        Δεν χρειάζεται να απαντήσετε σε αυτό το μήνυμα.
      </p>
    </div>
    
  </div>
</body>
</html>`;

    const resendRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: `${companyName} <onboarding@resend.dev>`,
        to: [agency?.email || "alex01pap@gmail.com"],
        subject: `📥 Νέο Παραστατικό: ${supplierName}${amountStr ? ` (${amountStr})` : ""}`,
        html: emailHtml,
      }),
    });

    if (!resendRes.ok) {
      const errBody = await resendRes.text();
      console.error("Resend error:", errBody);
      return new Response(JSON.stringify({ error: "Email sending failed", details: errBody }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("notify-team-invoice error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});