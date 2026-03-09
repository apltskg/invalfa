import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const BRAND = {
    primaryColor: 'hsl(220, 90%, 56%)',
    primaryForeground: '#ffffff',
    foreground: 'hsl(0, 0%, 8%)',
    mutedForeground: 'hsl(0, 0%, 45%)',
    background: '#ffffff',
    borderRadius: '12px',
};

function generateWelcomeEmailHtml(data: { name: string; email: string; temporaryPassword?: string }): string {
    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Καλώς ήρθατε στο TravelDocs</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f4f4f5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f4f5; padding: 40px 20px;">
        <tr>
            <td align="center">
                <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 520px; background-color: ${BRAND.background}; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 24px rgba(0, 0, 0, 0.08);">
                    <!-- Header -->
                    <tr>
                        <td style="background: ${BRAND.primaryColor}; padding: 32px 40px; text-align: center;">
                            <h1 style="margin: 0; color: ${BRAND.primaryForeground}; font-size: 24px; font-weight: 600;">
                                TravelDocs
                            </h1>
                            <p style="margin: 8px 0 0; color: rgba(255,255,255,0.85); font-size: 14px;">
                                Διαχείριση Παραστατικών
                            </p>
                        </td>
                    </tr>
                    
                    <!-- Content -->
                    <tr>
                        <td style="padding: 40px;">
                            <h2 style="margin: 0 0 16px; color: ${BRAND.foreground}; font-size: 20px; font-weight: 600;">
                                Καλώς ήρθατε, ${data.name}!
                            </h2>
                            
                            <p style="margin: 0 0 24px; color: ${BRAND.mutedForeground}; font-size: 15px; line-height: 1.6;">
                                Ο λογαριασμός σας στο TravelDocs δημιουργήθηκε με επιτυχία. Μπορείτε τώρα να συνδεθείτε και να διαχειριστείτε τα παραστατικά του ταξιδιωτικού γραφείου.
                            </p>
                            
                            <div style="background-color: #f4f4f5; border-radius: ${BRAND.borderRadius}; padding: 20px; margin-bottom: 24px;">
                                <p style="margin: 0 0 8px; color: ${BRAND.mutedForeground}; font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px;">
                                    Email σύνδεσης
                                </p>
                                <p style="margin: 0; color: ${BRAND.foreground}; font-size: 15px; font-weight: 500;">
                                    ${data.email}
                                </p>
                                ${data.temporaryPassword ? `
                                <p style="margin: 16px 0 8px; color: ${BRAND.mutedForeground}; font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px;">
                                    Προσωρινός κωδικός
                                </p>
                                <p style="margin: 0; color: ${BRAND.foreground}; font-size: 15px; font-weight: 500; font-family: monospace;">
                                    ${data.temporaryPassword}
                                </p>
                                ` : ''}
                            </div>
                            
                            <a href="https://invalfa.lovable.app/login" style="display: block; background: ${BRAND.primaryColor}; color: ${BRAND.primaryForeground}; text-decoration: none; padding: 14px 24px; border-radius: ${BRAND.borderRadius}; font-size: 15px; font-weight: 500; text-align: center;">
                                Σύνδεση στην πλατφόρμα
                            </a>
                            
                            <p style="margin: 24px 0 0; color: ${BRAND.mutedForeground}; font-size: 13px; line-height: 1.6;">
                                Αν χρειάζεστε βοήθεια, επικοινωνήστε με τον διαχειριστή του συστήματος.
                            </p>
                        </td>
                    </tr>
                    
                    <!-- Footer -->
                    <tr>
                        <td style="padding: 24px 40px; border-top: 1px solid #e4e4e7; text-align: center;">
                            <p style="margin: 0; color: ${BRAND.mutedForeground}; font-size: 12px;">
                                © ${new Date().getFullYear()} TravelDocs. Με επιφύλαξη παντός δικαιώματος.
                            </p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
    `.trim();
}

serve(async (req) => {
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

        const { name, email, temporaryPassword } = await req.json();

        if (!email || !name) {
            return new Response(
                JSON.stringify({ error: 'Missing required fields: name, email' }),
                { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        console.log(`Sending welcome email to ${email}...`);

        const htmlContent = generateWelcomeEmailHtml({ name, email, temporaryPassword });

        const response = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${RESEND_API_KEY}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                from: 'TravelDocs <onboarding@resend.dev>',
                to: [email],
                subject: 'Καλώς ήρθατε στο TravelDocs! 🎉',
                html: htmlContent,
            }),
        });

        const result = await response.json();

        if (!response.ok) {
            console.error('Resend error:', result);
            throw new Error(`Resend Error: ${JSON.stringify(result)}`);
        }

        console.log('Welcome email sent successfully:', result.id);

        return new Response(
            JSON.stringify({ success: true, messageId: result.id }),
            { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );

    } catch (error) {
        console.error('Welcome email error:', error);
        return new Response(
            JSON.stringify({ error: 'Failed to send welcome email' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }
});
