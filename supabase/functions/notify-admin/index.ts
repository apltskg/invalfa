import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
        return new Response(null, { headers: corsHeaders });
    }

    try {
        const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');

        if (!RESEND_API_KEY) {
            console.error('RESEND_API_KEY not configured');
            return new Response(
                JSON.stringify({ error: 'Email service not configured.' }),
                { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        const { type, data } = await req.json();

        if (type !== 'new_invoice_request' || !data) {
            return new Response(
                JSON.stringify({ error: 'Invalid request' }),
                { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        console.log('Sending notification email to admin array for new invoice request...');

        // In a real scenario, this would be an env var. We use a placeholder admin email or notify the travel agency owner.
        const ADMIN_EMAIL = Deno.env.get('ADMIN_EMAIL') || 'alex01pap@gmail.com'; // Fallback to user email

        const htmlContent = `
      <h2>Νέο Αίτημα Τιμολογίου</h2>
      <p>Υπάρχει ένα νέο αίτημα τιμολογίου στην πλατφόρμα:</p>
      <ul>
        <li><strong>Όνομα:</strong> ${data.full_name}</li>
        <li><strong>Εταιρεία:</strong> ${data.company_name}</li>
        <li><strong>Ποσό:</strong> €${data.amount}</li>
      </ul>
      <br/>
      <p>Μπορείτε να δείτε όλα τα αιτήματα στο διαχειριστικό περιβάλλον (Πύλη Λογιστή > Αιτήματα).</p>
    `;

        const response = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${RESEND_API_KEY}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                from: 'Invoice System <onboarding@resend.dev>', // Needs a verified domain in production
                to: [ADMIN_EMAIL],
                subject: `Νέο Αίτημα Τιμολογίου: ${data.company_name} - €${data.amount}`,
                html: htmlContent,
            }),
        });

        const result = await response.json();

        if (!response.ok) {
            throw new Error(`Resend Error: ${JSON.stringify(result)}`);
        }

        return new Response(
            JSON.stringify({ success: true, messageId: result.id }),
            { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );

    } catch (error) {
        console.error('Email notification error:', error);
        return new Response(
            JSON.stringify({ error: 'Internal server error' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }
});
