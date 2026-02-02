import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface LineItem {
  description: string;
  price: number;
  taxPercent: number;
  total: number;
}

interface ProformaEmailData {
  invoiceNumber: string;
  issueDate: string;
  clientName: string;
  clientAddress: string;
  clientEmail: string;
  clientVatNumber: string;
  lineItems: LineItem[];
  subtotal: number;
  discountPercent: number;
  discountAmount: number;
  taxAmount: number;
  total: number;
  acceptCash: boolean;
  acceptBankTransfer: boolean;
  notes: string;
  language: 'en' | 'el';
}

const COMPANY_INFO = {
  name: "ALFA MONOPROSOPI I.K.E.",
  address: "Thesi Filakio, Leptokarya, Pieria, Greece, 60063",
  phone: "+30 694 207 2312",
  email: "info@atravel.gr",
  website: "www.atravel.gr",
  vat: "EL801915410",
};

const BANK_ACCOUNTS = [
  {
    bank: "Eurobank",
    accountName: "ALFA MONOPROSOPI I.K.E.",
    iban: "GR3602607330008902011511103",
    bic: "ERBKGRAA",
  },
  {
    bank: "ALPHA Bank",
    accountName: "ALFA",
    iban: "GR7201407070707002002020365",
    bic: "CRBAGRAA",
  },
];

// HTML sanitization function - escapes special characters to prevent injection
function escapeHtml(text: string | null | undefined): string {
  if (!text) return '';
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// Email format validation
function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// Input length validation
function validateStringLength(str: string | null | undefined, maxLength: number): string {
  if (!str) return '';
  return str.substring(0, maxLength);
}

function generateEmailHTML(data: ProformaEmailData): string {
  const t = data.language === 'el' ? {
    title: 'Προτιμολόγιο',
    invoiceNumber: 'Αριθμός τιμολογίου',
    issueDate: 'Ημερομηνία έκδοσης',
    invoiceTo: 'Προς',
    service: 'Υπηρεσία',
    price: 'Τιμή',
    tax: 'ΦΠΑ',
    total: 'Σύνολο',
    subtotal: 'Υποσύνολο',
    discount: 'Έκπτωση',
    taxAmount: 'Ποσό ΦΠΑ',
    grandTotal: 'Τελικό Σύνολο',
    paymentMethods: 'Τρόποι Πληρωμής',
    cash: 'Μετρητά',
    bankTransfer: 'Τραπεζική Μεταφορά',
    notes: 'Σημειώσεις',
    thanks: 'Ευχαριστούμε που ταξιδεύετε μαζί μας!',
  } : {
    title: 'Proforma Invoice',
    invoiceNumber: 'Invoice Number',
    issueDate: 'Issue Date',
    invoiceTo: 'Invoice To',
    service: 'Service',
    price: 'Price',
    tax: 'Tax',
    total: 'Total',
    subtotal: 'Subtotal',
    discount: 'Discount',
    taxAmount: 'Tax Amount',
    grandTotal: 'Grand Total',
    paymentMethods: 'Payment Methods',
    cash: 'Cash',
    bankTransfer: 'Bank Transfer',
    notes: 'Notes',
    thanks: 'Thank you for traveling with us!',
  };

  // Sanitize all user-provided content
  const safeClientName = escapeHtml(validateStringLength(data.clientName, 200));
  const safeClientAddress = escapeHtml(validateStringLength(data.clientAddress, 500));
  const safeClientEmail = escapeHtml(validateStringLength(data.clientEmail, 255));
  const safeClientVatNumber = escapeHtml(validateStringLength(data.clientVatNumber, 50));
  const safeNotes = escapeHtml(validateStringLength(data.notes, 2000));
  const safeInvoiceNumber = escapeHtml(validateStringLength(data.invoiceNumber, 50));
  const safeIssueDate = escapeHtml(validateStringLength(data.issueDate, 20));

  const lineItemsHTML = (data.lineItems || []).slice(0, 50).map(item => `
    <tr>
      <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">${escapeHtml(validateStringLength(item.description, 500)) || '-'}</td>
      <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: right;">€${(Number(item.price) || 0).toFixed(2)}</td>
      <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: right;">${(Number(item.taxPercent) || 0)}%</td>
      <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: right;">€${(Number(item.total) || 0).toFixed(2)}</td>
    </tr>
  `).join('');

  const bankAccountsHTML = data.acceptBankTransfer ? BANK_ACCOUNTS.map(acc => `
    <div style="background: #f9fafb; padding: 12px; border-radius: 8px; margin-bottom: 8px;">
      <strong>${escapeHtml(acc.bank)}</strong><br/>
      <span style="color: #6b7280;">IBAN: ${escapeHtml(acc.iban)}</span><br/>
      <span style="color: #6b7280;">BIC: ${escapeHtml(acc.bic)}</span>
    </div>
  `).join('') : '';

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${t.title} - ${safeInvoiceNumber}</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 0; background-color: #f3f4f6;">
  <div style="max-width: 600px; margin: 0 auto; padding: 24px;">
    <div style="background: white; border-radius: 12px; padding: 32px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
      
      <!-- Header -->
      <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 24px;">
        <div>
          <h1 style="margin: 0; font-size: 28px; color: #3b82f6;">ALFA TRAVEL</h1>
          <p style="color: #6b7280; margin: 4px 0 0 0; font-size: 12px;">TRAVEL AGENCY</p>
        </div>
        <div style="text-align: right;">
          <h2 style="margin: 0; color: #3b82f6; font-size: 20px;">${t.title.toUpperCase()}</h2>
          <p style="color: #6b7280; margin: 8px 0 0 0; font-size: 14px;">
            ${t.invoiceNumber}: <strong>${safeInvoiceNumber}</strong><br/>
            ${t.issueDate}: <strong>${safeIssueDate}</strong>
          </p>
        </div>
      </div>
      
      <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;" />
      
      <!-- Client Info -->
      <div style="margin-bottom: 24px;">
        <h3 style="margin: 0 0 8px 0; color: #374151; font-size: 14px;">${t.invoiceTo}:</h3>
        <p style="margin: 0; color: #1f2937;">
          <strong>${safeClientName || '-'}</strong><br/>
          ${safeClientAddress ? safeClientAddress.replace(/\n/g, '<br/>') : ''}<br/>
          ${safeClientEmail}<br/>
          ${safeClientVatNumber ? `VAT: ${safeClientVatNumber}` : ''}
        </p>
      </div>
      
      <!-- Line Items Table -->
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px;">
        <thead>
          <tr style="background: #f9fafb;">
            <th style="padding: 12px; text-align: left; font-weight: 600; color: #374151; border-bottom: 2px solid #e5e7eb;">${t.service}</th>
            <th style="padding: 12px; text-align: right; font-weight: 600; color: #374151; border-bottom: 2px solid #e5e7eb;">${t.price}</th>
            <th style="padding: 12px; text-align: right; font-weight: 600; color: #374151; border-bottom: 2px solid #e5e7eb;">${t.tax}</th>
            <th style="padding: 12px; text-align: right; font-weight: 600; color: #374151; border-bottom: 2px solid #e5e7eb;">${t.total}</th>
          </tr>
        </thead>
        <tbody>
          ${lineItemsHTML}
        </tbody>
      </table>
      
      <!-- Totals -->
      <div style="display: flex; justify-content: flex-end; margin-bottom: 24px;">
        <div style="width: 250px;">
          <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e5e7eb;">
            <span style="color: #6b7280;">${t.subtotal}:</span>
            <span style="font-weight: 500;">€${(Number(data.subtotal) || 0).toFixed(2)}</span>
          </div>
          ${(Number(data.discountPercent) || 0) > 0 ? `
          <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e5e7eb;">
            <span style="color: #6b7280;">${t.discount} (${(Number(data.discountPercent) || 0)}%):</span>
            <span style="font-weight: 500; color: #10b981;">-€${(Number(data.discountAmount) || 0).toFixed(2)}</span>
          </div>
          ` : ''}
          <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e5e7eb;">
            <span style="color: #6b7280;">${t.taxAmount}:</span>
            <span style="font-weight: 500;">€${(Number(data.taxAmount) || 0).toFixed(2)}</span>
          </div>
          <div style="display: flex; justify-content: space-between; padding: 12px 0; background: #f9fafb; margin-top: 8px; border-radius: 8px; padding-left: 12px; padding-right: 12px;">
            <span style="font-weight: 600; color: #1f2937;">${t.grandTotal}:</span>
            <span style="font-weight: 700; font-size: 18px; color: #3b82f6;">€${(Number(data.total) || 0).toFixed(2)}</span>
          </div>
        </div>
      </div>
      
      <!-- Payment Methods -->
      <div style="margin-bottom: 24px;">
        <h3 style="margin: 0 0 12px 0; color: #374151; font-size: 14px;">${t.paymentMethods}:</h3>
        ${data.acceptCash ? `<p style="margin: 0 0 8px 0; color: #6b7280;">✓ ${t.cash}</p>` : ''}
        ${data.acceptBankTransfer ? `
          <p style="margin: 0 0 12px 0; color: #6b7280;">✓ ${t.bankTransfer}</p>
          ${bankAccountsHTML}
        ` : ''}
      </div>
      
      <!-- Notes -->
      ${safeNotes ? `
      <div style="margin-bottom: 24px; background: #fef3c7; padding: 16px; border-radius: 8px;">
        <h3 style="margin: 0 0 8px 0; color: #92400e; font-size: 14px;">${t.notes}:</h3>
        <p style="margin: 0; color: #78350f;">${safeNotes}</p>
      </div>
      ` : ''}
      
      <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;" />
      
      <!-- Footer -->
      <div style="text-align: center; color: #6b7280; font-size: 12px;">
        <p style="margin: 0 0 8px 0;"><strong>${COMPANY_INFO.name}</strong></p>
        <p style="margin: 0 0 4px 0;">${COMPANY_INFO.address}</p>
        <p style="margin: 0 0 4px 0;">${COMPANY_INFO.phone} | ${COMPANY_INFO.email}</p>
        <p style="margin: 0 0 16px 0;">VAT: ${COMPANY_INFO.vat}</p>
        <p style="margin: 0; color: #3b82f6; font-weight: 500;">${t.thanks}</p>
      </div>
      
    </div>
  </div>
</body>
</html>
  `;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // ============ AUTHENTICATION CHECK ============
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      console.error('Missing or invalid Authorization header');
      return new Response(
        JSON.stringify({ error: 'Authentication required', code: 'AUTH_REQUIRED' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY');

    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
      console.error('Supabase environment variables not configured');
      return new Response(
        JSON.stringify({ error: 'Service temporarily unavailable', code: 'CONFIG_ERROR' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const authClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } }
    });

    const { data: userData, error: authError } = await authClient.auth.getUser(token);
    if (authError || !userData?.user) {
      console.error('Authentication failed');
      return new Response(
        JSON.stringify({ error: 'Invalid session', code: 'INVALID_SESSION' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Request authenticated successfully');
    // ============ END AUTHENTICATION CHECK ============

    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
    
    if (!RESEND_API_KEY) {
      console.error('RESEND_API_KEY not configured');
      return new Response(
        JSON.stringify({ 
          error: 'Email service not configured. Please add RESEND_API_KEY to secrets.',
          code: 'MISSING_API_KEY'
        }),
        { 
          status: 503, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const data: ProformaEmailData = await req.json();
    
    // Validate required fields
    if (!data.clientEmail) {
      return new Response(
        JSON.stringify({ error: 'Client email is required', code: 'MISSING_EMAIL' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate email format
    if (!isValidEmail(data.clientEmail)) {
      return new Response(
        JSON.stringify({ error: 'Invalid email format', code: 'INVALID_EMAIL' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Sending proforma email');

    const emailHTML = generateEmailHTML(data);
    const safeInvoiceNumber = escapeHtml(validateStringLength(data.invoiceNumber, 50));
    const subject = data.language === 'el' 
      ? `Προτιμολόγιο ${safeInvoiceNumber} - ALFA Travel`
      : `Proforma Invoice ${safeInvoiceNumber} - ALFA Travel`;

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'ALFA Travel <onboarding@resend.dev>', // Use your verified domain in production
        to: [data.clientEmail],
        subject: subject,
        html: emailHTML,
      }),
    });

    const result = await response.json();
    console.log('Email send completed');

    if (!response.ok) {
      console.error('Email service error:', response.status);
      return new Response(
        JSON.stringify({ error: 'Failed to send email. Please try again later.', code: 'EMAIL_SEND_FAILED' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ success: true, messageId: result.id }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Email function error:', error);
    return new Response(
      JSON.stringify({ error: 'An unexpected error occurred. Please try again.', code: 'INTERNAL_ERROR' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
