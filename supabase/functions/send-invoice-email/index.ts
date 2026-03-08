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
<head><meta charset="utf-8"></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #f8f9fa; padding: 40px 20px;">
  <div style="max-width: 520px; margin: 0 auto; background: #fff; border-radius: 16px; overflow: hidden; box-shadow: 0 2px 12px rgba(0,0,0,0.08);">
    <div style="background: #2563eb; padding: 28px 32px;">
      <h1 style="margin: 0; color: #fff; font-size: 18px; font-weight: 600;">${companyName}</h1>
      <p style="margin: 6px 0 0; color: rgba(255,255,255,0.8); font-size: 13px;">Νέο τιμολόγιο διαθέσιμο</p>
    </div>
    <div style="padding: 32px;">
      <p style="margin: 0 0 16px; color: #1a1a1a; font-size: 15px;">
        Αγαπητέ/ή <strong>${share.customer_name || "πελάτη"}</strong>,
      </p>
      ${share.message ? `<p style="margin: 0 0 16px; color: #555; font-size: 14px;">${share.message}</p>` : ""}
      <div style="background: #f0f4ff; border-radius: 12px; padding: 16px 20px; margin: 0 0 24px;">
        <p style="margin: 0 0 4px; color: #666; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px;">Στοιχεία τιμολογίου</p>
        <p style="margin: 0; color: #1a1a1a; font-size: 15px; font-weight: 600;">${merchantStr} ${amountStr ? `— ${amountStr}` : ""}</p>
        ${invoice?.invoice_date ? `<p style="margin: 4px 0 0; color: #888; font-size: 13px;">Ημ/νία: ${invoice.invoice_date}</p>` : ""}
      </div>
      <a href="${viewUrl}" style="display: block; text-align: center; background: #2563eb; color: #fff; text-decoration: none; padding: 14px 24px; border-radius: 10px; font-size: 14px; font-weight: 600;">
        Προβολή Τιμολογίου →
      </a>
      <p style="margin: 24px 0 0; color: #999; font-size: 11px; text-align: center;">
        Αυτό το email στάλθηκε από το ${companyName}. Αν δεν αναγνωρίζετε αυτό το μήνυμα, αγνοήστε το.
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
