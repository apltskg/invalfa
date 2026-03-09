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

    const { invoiceId, customerEmail, customerName, message, daysPastDue } = await req.json();
    if (!invoiceId || !customerEmail) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
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
      .select("merchant, amount, invoice_date, file_name, extracted_data")
      .eq("id", invoiceId)
      .single();

    if (invoiceErr || !invoice) {
      return new Response(JSON.stringify({ error: "Invoice not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check if hub_share exists, create if not
    const { data: existingShare } = await serviceClient
      .from("hub_shares")
      .select("token")
      .eq("invoice_id", invoiceId)
      .eq("customer_email", customerEmail)
      .single();

    let shareToken;
    if (existingShare) {
      shareToken = existingShare.token;
    } else {
      // Create new hub_share
      const { data: newShare, error: shareErr } = await serviceClient
        .from("hub_shares")
        .insert({
          invoice_id: invoiceId,
          customer_email: customerEmail,
          customer_name: customerName,
          status: "pending",
          message: message || null,
        })
        .select("token")
        .single();

      if (shareErr || !newShare) {
        return new Response(JSON.stringify({ error: "Failed to create share token" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      shareToken = newShare.token;
    }

    // Fetch agency settings
    const { data: agency } = await serviceClient
      .from("agency_settings")
      .select("company_name, email, phone")
      .single();

    const companyName = agency?.company_name || "TravelDocs";
    const siteUrl = req.headers.get("origin") || "https://invalfa.lovable.app";
    const viewUrl = `${siteUrl}/view-invoice/${shareToken}`;

    const extractedData = invoice.extracted_data as any;
    const invoiceData = extractedData?.extracted || extractedData;
    const invoiceNumber = invoiceData?.invoice_number || "";
    const amountStr = invoice?.amount ? `€${Number(invoice.amount).toFixed(2)}` : "";
    const merchantStr = invoice?.merchant || "—";

    // Determine reminder urgency based on days past due
    const isUrgent = (daysPastDue || 0) >= 30;
    const isOverdue = (daysPastDue || 0) >= 60;

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
  <title>Υπενθύμιση Πληρωμής</title>
</head>
<body style="margin: 0; padding: 0; background-color: #ffffff; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;">
  <div style="max-width: 600px; margin: 0 auto; background: #ffffff;">
    
    <!-- Header -->
    <div style="background: linear-gradient(135deg, ${isOverdue ? '#dc2626' : isUrgent ? '#d97706' : '#2563eb'} 0%, ${isOverdue ? '#ef4444' : isUrgent ? '#f59e0b' : '#3b82f6'} 100%); padding: 40px 32px; text-align: center;">
      <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 600; letter-spacing: -0.5px;">
        ${companyName}
      </h1>
      <p style="margin: 8px 0 0; color: rgba(255,255,255,0.9); font-size: 15px; font-weight: 400;">
        ${isOverdue ? '🚨 Επείγουσα υπενθύμιση' : isUrgent ? '⚠️ Φιλική υπενθύμιση' : '💌 Ευγενική υπενθύμιση'}
      </p>
    </div>

    <!-- Main Content -->
    <div style="padding: 40px 32px;">
      
      <!-- Greeting -->
      <div style="margin-bottom: 32px;">
        <p style="margin: 0; color: #1f2937; font-size: 16px; line-height: 1.6;">
          Γεια σας <strong style="color: #2563eb;">${customerName || "αγαπητέ πελάτη"}</strong>! 👋
        </p>
        <p style="margin: 12px 0 0; color: #6b7280; font-size: 15px; line-height: 1.6;">
          ${isOverdue 
            ? 'Σας γράφουμε σχετικά με ένα παραστατικό που παραμένει ανεξόφλητο για αρκετό καιρό.'
            : isUrgent 
              ? 'Θα θέλαμε να σας υπενθυμίσουμε ένα παραστατικό που χρειάζεται την προσοχή σας.'
              : 'Ελπίζουμε να είστε καλά! Σας στέλνουμε μια φιλική υπενθύμιση για ένα παραστατικό.'
          }
        </p>
      </div>

      ${message ? `
      <!-- Personal Message -->
      <div style="background: #f8fafc; border-left: 4px solid #2563eb; padding: 20px 24px; margin-bottom: 32px; border-radius: 0 8px 8px 0;">
        <p style="margin: 0; color: #374151; font-size: 15px; line-height: 1.6; font-style: italic;">
          "${message}"
        </p>
      </div>
      ` : ""}

      <!-- Invoice Details Card -->
      <div style="background: ${isOverdue ? '#fef2f2' : isUrgent ? '#fefbeb' : '#f9fafb'}; border: 1px solid ${isOverdue ? '#fecaca' : isUrgent ? '#fed7aa' : '#e5e7eb'}; border-radius: 12px; padding: 24px; margin-bottom: 32px;">
        <div style="display: flex; align-items: center; margin-bottom: 16px;">
          <div style="width: 40px; height: 40px; background: ${isOverdue ? '#dc2626' : isUrgent ? '#d97706' : '#2563eb'}; border-radius: 8px; display: flex; align-items: center; justify-content: center; margin-right: 12px;">
            <span style="color: white; font-size: 18px;">${isOverdue ? '🚨' : isUrgent ? '⚠️' : '📄'}</span>
          </div>
          <div>
            <h3 style="margin: 0; color: #1f2937; font-size: 16px; font-weight: 600;">
              Στοιχεία Παραστατικού
            </h3>
            <p style="margin: 4px 0 0; color: ${isOverdue ? '#dc2626' : isUrgent ? '#d97706' : '#6b7280'}; font-size: 13px;">
              ${daysPastDue && daysPastDue > 0 
                ? `Καθυστέρηση: ${daysPastDue} ημέρες`
                : 'Κλικ για προβολή και πληρωμή'
              }
            </p>
          </div>
        </div>
        
        <div style="border-top: 1px solid ${isOverdue ? '#fecaca' : isUrgent ? '#fed7aa' : '#e5e7eb'}; padding-top: 16px;">
          ${merchantStr !== "—" ? `
          <div style="margin-bottom: 8px;">
            <span style="color: #6b7280; font-size: 13px; display: inline-block; width: 80px;">Εκδότης:</span>
            <span style="color: #1f2937; font-size: 14px; font-weight: 500;">${merchantStr}</span>
          </div>
          ` : ""}
          
          ${invoiceNumber ? `
          <div style="margin-bottom: 8px;">
            <span style="color: #6b7280; font-size: 13px; display: inline-block; width: 80px;">Αριθμός:</span>
            <span style="color: #1f2937; font-size: 14px;">${invoiceNumber}</span>
          </div>
          ` : ""}
          
          ${amountStr ? `
          <div style="margin-bottom: 8px;">
            <span style="color: #6b7280; font-size: 13px; display: inline-block; width: 80px;">Ποσό:</span>
            <span style="color: ${isOverdue ? '#dc2626' : isUrgent ? '#d97706' : '#059669'}; font-size: 18px; font-weight: 700;">${amountStr}</span>
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
        <a href="${viewUrl}" style="display: inline-block; background: linear-gradient(135deg, ${isOverdue ? '#dc2626' : isUrgent ? '#d97706' : '#2563eb'} 0%, ${isOverdue ? '#ef4444' : isUrgent ? '#f59e0b' : '#3b82f6'} 100%); color: #ffffff; text-decoration: none; padding: 16px 32px; border-radius: 12px; font-size: 16px; font-weight: 600; box-shadow: 0 4px 12px rgba(${isOverdue ? '220, 38, 38' : isUrgent ? '217, 119, 6' : '37, 99, 235'}, 0.3);">
          ${isOverdue ? '🚨 Άμεση Ενέργεια' : isUrgent ? '⏰ Προβολή & Πληρωμή' : '💳 Προβολή Παραστατικού'}
        </a>
      </div>

      <!-- Help Text -->
      <div style="text-align: center; margin-bottom: 24px;">
        <p style="margin: 0; color: #6b7280; font-size: 13px; line-height: 1.5;">
          ${isOverdue 
            ? 'Αν έχετε ήδη προχωρήσει στην πληρωμή, παρακαλούμε αγνοήστε αυτό το μήνυμα.'
            : 'Μπορείτε να προβάλετε το παραστατικό και τις λεπτομέρειες πληρωμής κάνοντας κλικ παραπάνω.'
          }
        </p>
      </div>

      ${isOverdue ? '' : `
      <!-- Contact Info -->
      <div style="background: #f0f9ff; border: 1px solid #bae6fd; border-radius: 12px; padding: 20px 24px; margin-bottom: 24px;">
        <p style="margin: 0; color: #075985; font-size: 14px; line-height: 1.6; text-align: center;">
          <strong>Χρειάζεστε βοήθεια;</strong><br>
          Μη διστάσετε να επικοινωνήσετε μαζί μας${agency?.phone ? ` στο ${agency.phone}` : ''}${agency?.email ? ` ή στο ${agency.email}` : ''}.
        </p>
      </div>
      `}

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
        Αυτό το email στάλθηκε στη διεύθυνση ${customerEmail}.<br>
        ${isOverdue 
          ? 'Αν έχετε ερωτήσεις σχετικά με αυτό το παραστατικό, παρακαλούμε επικοινωνήστε μαζί μας.'
          : 'Ευχαριστούμε για τη συνεργασία και την κατανόηση!'
        }
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
        to: [customerEmail],
        subject: `${isOverdue ? '🚨' : isUrgent ? '⚠️' : '💌'} Υπενθύμιση πληρωμής${invoiceNumber ? ` - ${invoiceNumber}` : ''}${amountStr ? ` (${amountStr})` : ''}`,
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

    // Update hub_share status to reminder_sent
    await serviceClient
      .from("hub_shares")
      .update({ 
        email_sent_at: new Date().toISOString(), 
        status: "reminder_sent" 
      })
      .eq("token", shareToken);

    return new Response(JSON.stringify({ success: true, viewUrl }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("send-payment-reminder error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});