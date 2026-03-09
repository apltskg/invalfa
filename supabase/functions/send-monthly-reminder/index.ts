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
    successColor: 'hsl(142, 71%, 45%)',
    warningColor: 'hsl(38, 92%, 50%)',
};

interface MonthlyReminderData {
    recipientEmail: string;
    recipientName: string;
    monthLabel: string;
    completedSteps: number;
    totalSteps: number;
    pendingTasks?: string[];
    portalLink?: string;
}

function generateMonthlyReminderHtml(data: MonthlyReminderData): string {
    const progressPct = Math.round((data.completedSteps / data.totalSteps) * 100);
    const isComplete = progressPct >= 100;
    
    const pendingTasksHtml = data.pendingTasks && data.pendingTasks.length > 0
        ? `
            <div style="background-color: #fef3c7; border-radius: ${BRAND.borderRadius}; padding: 16px; margin-bottom: 24px;">
                <p style="margin: 0 0 12px; color: #92400e; font-size: 14px; font-weight: 500;">
                    ⚠️ Εκκρεμείς εργασίες:
                </p>
                <ul style="margin: 0; padding-left: 20px; color: #78350f; font-size: 14px; line-height: 1.8;">
                    ${data.pendingTasks.map(task => `<li>${task}</li>`).join('')}
                </ul>
            </div>
        `
        : '';

    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Μηνιαίο Κλείσιμο - ${data.monthLabel}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f4f4f5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f4f5; padding: 40px 20px;">
        <tr>
            <td align="center">
                <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 520px; background-color: ${BRAND.background}; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 24px rgba(0, 0, 0, 0.08);">
                    <!-- Header -->
                    <tr>
                        <td style="background: ${isComplete ? BRAND.successColor : BRAND.primaryColor}; padding: 32px 40px; text-align: center;">
                            <h1 style="margin: 0; color: ${BRAND.primaryForeground}; font-size: 24px; font-weight: 600;">
                                ${isComplete ? '✅' : '📊'} Μηνιαίο Κλείσιμο
                            </h1>
                            <p style="margin: 8px 0 0; color: rgba(255,255,255,0.9); font-size: 16px; font-weight: 500;">
                                ${data.monthLabel}
                            </p>
                        </td>
                    </tr>
                    
                    <!-- Content -->
                    <tr>
                        <td style="padding: 40px;">
                            <p style="margin: 0 0 24px; color: ${BRAND.foreground}; font-size: 16px; line-height: 1.6;">
                                Αγαπητέ/ή ${data.recipientName},
                            </p>
                            
                            <p style="margin: 0 0 24px; color: ${BRAND.mutedForeground}; font-size: 15px; line-height: 1.6;">
                                ${isComplete 
                                    ? 'Το μηνιαίο κλείσιμο έχει ολοκληρωθεί! Όλα τα παραστατικά και οι κινήσεις έχουν επεξεργαστεί.'
                                    : 'Σας υπενθυμίζουμε ότι το μηνιαίο κλείσιμο βρίσκεται σε εξέλιξη. Παρακάτω βλέπετε την τρέχουσα πρόοδο:'
                                }
                            </p>
                            
                            <!-- Progress Bar -->
                            <div style="background-color: #e4e4e7; border-radius: 8px; height: 12px; margin-bottom: 12px; overflow: hidden;">
                                <div style="background: ${isComplete ? BRAND.successColor : BRAND.primaryColor}; height: 100%; width: ${progressPct}%; border-radius: 8px;"></div>
                            </div>
                            <p style="margin: 0 0 24px; color: ${BRAND.mutedForeground}; font-size: 14px; text-align: center;">
                                <strong style="color: ${BRAND.foreground};">${data.completedSteps}/${data.totalSteps}</strong> βήματα ολοκληρωμένα (${progressPct}%)
                            </p>
                            
                            ${pendingTasksHtml}
                            
                            ${data.portalLink ? `
                            <a href="${data.portalLink}" style="display: block; background: ${BRAND.primaryColor}; color: ${BRAND.primaryForeground}; text-decoration: none; padding: 14px 24px; border-radius: ${BRAND.borderRadius}; font-size: 15px; font-weight: 500; text-align: center; margin-bottom: 24px;">
                                Άνοιγμα Πύλης Λογιστή
                            </a>
                            ` : `
                            <a href="https://invalfa.lovable.app/monthly-closing" style="display: block; background: ${BRAND.primaryColor}; color: ${BRAND.primaryForeground}; text-decoration: none; padding: 14px 24px; border-radius: ${BRAND.borderRadius}; font-size: 15px; font-weight: 500; text-align: center; margin-bottom: 24px;">
                                Συνέχεια στο Μηνιαίο Κλείσιμο
                            </a>
                            `}
                            
                            <p style="margin: 0; color: ${BRAND.mutedForeground}; font-size: 13px; line-height: 1.6;">
                                Αυτό το email στάλθηκε αυτόματα από το σύστημα TravelDocs.
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

        const body: MonthlyReminderData = await req.json();
        
        const { recipientEmail, recipientName, monthLabel, completedSteps, totalSteps, pendingTasks, portalLink } = body;

        if (!recipientEmail || !recipientName || !monthLabel) {
            return new Response(
                JSON.stringify({ error: 'Missing required fields: recipientEmail, recipientName, monthLabel' }),
                { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        console.log(`Sending monthly reminder to ${recipientEmail} for ${monthLabel}...`);

        const htmlContent = generateMonthlyReminderHtml({
            recipientEmail,
            recipientName,
            monthLabel,
            completedSteps: completedSteps || 0,
            totalSteps: totalSteps || 8,
            pendingTasks,
            portalLink,
        });

        const isComplete = (completedSteps || 0) >= (totalSteps || 8);

        const response = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${RESEND_API_KEY}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                from: 'TravelDocs <onboarding@resend.dev>',
                to: [recipientEmail],
                subject: isComplete 
                    ? `✅ Μηνιαίο Κλείσιμο Ολοκληρώθηκε - ${monthLabel}`
                    : `📊 Υπενθύμιση Μηνιαίου Κλεισίματος - ${monthLabel}`,
                html: htmlContent,
            }),
        });

        const result = await response.json();

        if (!response.ok) {
            console.error('Resend error:', result);
            throw new Error(`Resend Error: ${JSON.stringify(result)}`);
        }

        console.log('Monthly reminder sent successfully:', result.id);

        return new Response(
            JSON.stringify({ success: true, messageId: result.id }),
            { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );

    } catch (error) {
        console.error('Monthly reminder error:', error);
        return new Response(
            JSON.stringify({ error: 'Failed to send monthly reminder' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }
});
