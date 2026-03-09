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

    const { shareId } = await req.json();
    if (!shareId || typeof shareId !== "string") {
      return new Response(JSON.stringify({ error: "Missing shareId" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch the share + invoice details using service role
    const serviceClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: share, error: shareErr } = await serviceClient
      .from("hub_shares")
      .select("*, invoices:invoice_id(merchant, amount, invoice_date, file_name)")
      .eq("id", shareId)
      .single();

    if (shareErr || !share) {
      return new Response(JSON.stringify({ error: "Share not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch agency settings for branding
    const { data: agency } = await serviceClient
      .from("agency_settings")
      .select("company_name, email, phone")
      .single();

    const companyName = agency?.company_name || "TravelDocs";
    const siteUrl = req.headers.get("origin") || "https://invalfa.lovable.app";
    const viewUrl = `${siteUrl}/view-invoice/${share.token}`;

    const invoice = share.invoices as any;
    const amountStr = invoice?.amount ? `€${Number(invoice.amount).toFixed(2)}` : "";
    const merchantStr = invoice?.merchant || "—";

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
  <title>Νέο Παραστατικό</title>
</head>
<body style="margin: 0; padding: 0; background-color: #ffffff; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;">
  <div style="max-width: 600px; margin: 0 auto; background: #ffffff;">
    
    <!-- Header -->
    <div style="background: linear-gradient(135deg, #2563eb 0%, #3b82f6 100%); padding: 40px 32px; text-align: center;">
      <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 600; letter-spacing: -0.5px;">
        ${companyName}
      </h1>
      <p style="margin: 8px 0 0; color: rgba(255,255,255,0.9); font-size: 15px; font-weight: 400;">
        📧 Νέο παραστατικό διαθέσιμο για εσάς
      </p>
    </div>

    <!-- Main Content -->
    <div style="padding: 40px 32px;">
      
      <!-- Greeting -->
      <div style="margin-bottom: 32px;">
        <p style="margin: 0; color: #1f2937; font-size: 16px; line-height: 1.6;">
          Γεια σας <strong style="color: #2563eb;">${share.customer_name || "αγαπητέ πελάτη"}</strong>! 👋
        </p>
        <p style="margin: 12px 0 0; color: #6b7280; font-size: 15px; line-height: 1.6;">
          Σας στέλνουμε ένα νέο παραστατικό που ίσως σας ενδιαφέρει.
        </p>
      </div>

      ${share.message ? `
      <!-- Personal Message -->
      <div style="background: #f8fafc; border-left: 4px solid #2563eb; padding: 20px 24px; margin-bottom: 32px; border-radius: 0 8px 8px 0;">
        <p style="margin: 0; color: #374151; font-size: 15px; line-height: 1.6; font-style: italic;">
          "${share.message}"
        </p>
      </div>
      ` : ""}

      <!-- Invoice Details Card -->
      <div style="background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 12px; padding: 24px; margin-bottom: 32px;">
        <div style="display: flex; align-items: center; margin-bottom: 16px;">
          <div style="width: 40px; height: 40px; background: #2563eb; border-radius: 8px; display: flex; align-items: center; justify-content: center; margin-right: 12px;">
            <span style="color: white; font-size: 18px;">📄</span>
          </div>
          <div>
            <h3 style="margin: 0; color: #1f2937; font-size: 16px; font-weight: 600;">
              Στοιχεία Παραστατικού
            </h3>
            <p style="margin: 4px 0 0; color: #6b7280; font-size: 13px;">
              Κλικ για προβολή και λήψη
            </p>
          </div>
        </div>
        
        <div style="border-top: 1px solid #e5e7eb; padding-top: 16px;">
          ${merchantStr ? `
          <div style="margin-bottom: 8px;">
            <span style="color: #6b7280; font-size: 13px; display: inline-block; width: 80px;">Εκδότης:</span>
            <span style="color: #1f2937; font-size: 14px; font-weight: 500;">${merchantStr}</span>
          </div>
          ` : ""}
          
          ${amountStr ? `
          <div style="margin-bottom: 8px;">
            <span style="color: #6b7280; font-size: 13px; display: inline-block; width: 80px;">Ποσό:</span>
            <span style="color: #059669; font-size: 16px; font-weight: 600;">${amountStr}</span>
          </div>
          ` : ""}
          
          ${invoice?.invoice_date ? `
          <div>
            <span style="color: #6b7280; font-size: 13px; display: inline-block; width: 80px;">Ημερομηνία:</span>
            <span style="color: #1f2937; font-size: 14px;">${invoice.invoice_date}</span>
          </div>
          ` : ""}
        </div>
      </div>

      <!-- CTA Button -->
      <div style="text-align: center; margin-bottom: 32px;">
        <a href="${viewUrl}" style="display: inline-block; background: linear-gradient(135deg, #2563eb 0%, #3b82f6 100%); color: #ffffff; text-decoration: none; padding: 16px 32px; border-radius: 12px; font-size: 16px; font-weight: 600; box-shadow: 0 4px 12px rgba(37, 99, 235, 0.3); transition: all 0.2s;">
          📱 Προβολή Παραστατικού
        </a>
      </div>

      <!-- Help Text -->
      <div style="text-align: center; margin-bottom: 24px;">
        <p style="margin: 0; color: #6b7280; font-size: 13px; line-height: 1.5;">
          Μπορείτε να προβάλετε το παραστατικό στον browser σας και να το κατεβάσετε σε PDF μορφή.
        </p>
      </div>

    </div>

    <!-- Footer -->
    <div style="background: #f9fafb; padding: 24px 32px; text-align: center; border-top: 1px solid #e5e7eb;">
      <p style="margin: 0 0 8px; color: #374151; font-size: 14px; font-weight: 500;">
        ${companyName}
      </p>
      ${agency?.email ? `
      <p style="margin: 0 0 8px; color: #6b7280; font-size: 13px;">
        📧 ${agency.email}
      </p>
      ` : ""}
      ${agency?.phone ? `
      <p style="margin: 0 0 12px; color: #6b7280; font-size: 13px;">
        📞 ${agency.phone}
      </p>
      ` : ""}
      <p style="margin: 0; color: #9ca3af; font-size: 11px; line-height: 1.4;">
        Αυτό το email στάλθηκε από τη διεύθυνση ${share.customer_email}.<br>
        Αν δεν αναμένατε αυτό το μήνυμα, μπορείτε να το αγνοήσετε.
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
        to: [share.customer_email],
        subject: `Νέο τιμολόγιο από ${companyName}${amountStr ? ` (${amountStr})` : ""}`,
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

    // Update share status
    await serviceClient
      .from("hub_shares")
      .update({ email_sent_at: new Date().toISOString(), status: "sent" })
      .eq("id", shareId);

    return new Response(JSON.stringify({ success: true, viewUrl }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("send-invoice-email error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
