import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface EmailTemplate {
    subject: string;
    body: string;
}

export interface InvoiceEmailData {
    invoiceId: string;
    invoiceNumber: string | null;
    amount: number;
    dueDate: string | null;
    customerEmail: string;
    customerName: string;
    fileUrl?: string;
}

export interface ReminderEmailData {
    invoiceId: string;
    invoiceNumber: string | null;
    amount: number;
    daysPastDue: number;
    customerEmail: string;
    customerName: string;
}

/**
 * Email templates in Greek
 */
export const EMAIL_TEMPLATES = {
    newInvoice: (data: InvoiceEmailData): EmailTemplate => ({
        subject: `Νέο Τιμολόγιο ${data.invoiceNumber || ''} - €${data.amount.toFixed(2)}`,
        body: `
Αγαπητέ/ή ${data.customerName},

Σας αποστέλλουμε το τιμολόγιο ${data.invoiceNumber || ''} με ποσό €${data.amount.toFixed(2)}.

${data.dueDate ? `Ημερομηνία πληρωμής: ${data.dueDate}` : ''}

Παρακαλούμε για την έγκαιρη εξόφλησή του.

Με εκτίμηση,
Always First Travel
    `.trim()
    }),

    paymentReminder: (data: ReminderEmailData): EmailTemplate => ({
        subject: `Υπενθύμιση Πληρωμής - Τιμολόγιο ${data.invoiceNumber || ''}`,
        body: `
Αγαπητέ/ή ${data.customerName},

Σας υπενθυμίζουμε ότι το τιμολόγιο ${data.invoiceNumber || ''} με ποσό €${data.amount.toFixed(2)} παραμένει ανεξόφλητο.

Ημέρες καθυστέρησης: ${data.daysPastDue}

Παρακαλούμε για την άμεση τακτοποίηση.

Με εκτίμηση,
Always First Travel
    `.trim()
    }),

    overdueNotice: (data: ReminderEmailData): EmailTemplate => ({
        subject: `⚠️ Ληξιπρόθεσμη Οφειλή - Τιμολόγιο ${data.invoiceNumber || ''}`,
        body: `
Αγαπητέ/ή ${data.customerName},

Σας ενημερώνουμε ότι το τιμολόγιο ${data.invoiceNumber || ''} με ποσό €${data.amount.toFixed(2)} είναι ληξιπρόθεσμο.

Ημέρες καθυστέρησης: ${data.daysPastDue}

Παρακαλούμε για την άμεση επικοινωνία σας.

Με εκτίμηση,
Always First Travel
    `.trim()
    }),

    paymentConfirmation: (data: { customerName: string; invoiceNumber: string; amount: number }): EmailTemplate => ({
        subject: `✓ Επιβεβαίωση Πληρωμής - Τιμολόγιο ${data.invoiceNumber}`,
        body: `
Αγαπητέ/ή ${data.customerName},

Σας ευχαριστούμε! Η πληρωμή σας για το τιμολόγιο ${data.invoiceNumber} (€${data.amount.toFixed(2)}) καταχωρήθηκε επιτυχώς.

Με εκτίμηση,
Always First Travel
    `.trim()
    }),
};

/**
 * Send an email (uses Supabase Edge Function or external service)
 */
export async function sendEmail(
    to: string,
    subject: string,
    body: string,
    attachmentUrl?: string
): Promise<boolean> {
    try {
        // In production, this would call a Supabase Edge Function or external email API
        // For now, we'll simulate and log
        console.log("📧 Sending email:", { to, subject, body: body.substring(0, 100) + "..." });

        // Log to database
        await supabase.from("email_logs" as any).insert({
            recipient: to,
            subject,
            body,
            attachment_url: attachmentUrl,
            status: "sent",
            sent_at: new Date().toISOString(),
        });

        return true;
    } catch (error) {
        console.error("Email send error:", error);
        return false;
    }
}

/**
 * Send invoice to customer
 */
export async function sendInvoiceEmail(invoiceId: string): Promise<boolean> {
    try {
        // Fetch invoice details
        const { data: invoice, error } = await supabase
            .from("invoices")
            .select(`
        id, amount, invoice_date, file_path, extracted_data,
        customer_id, merchant,
        customers (id, name, email)
      `)
            .eq("id", invoiceId)
            .single();

        if (error || !invoice) {
            toast.error("Σφάλμα φόρτωσης τιμολογίου");
            return false;
        }

        const customer = invoice.customers as any;
        const rawExtracted = invoice.extracted_data as any;
        const extractedData = rawExtracted?.extracted || rawExtracted;

        if (!customer?.email) {
            toast.error("Ο πελάτης δεν έχει email");
            return false;
        }

        // Get signed URL for attachment
        let fileUrl: string | undefined;
        if (invoice.file_path) {
            const { data: signedUrl } = await supabase.storage
                .from("invoices")
                .createSignedUrl(invoice.file_path, 86400); // 24 hours
            fileUrl = signedUrl?.signedUrl;
        }

        const emailData: InvoiceEmailData = {
            invoiceId: invoice.id,
            invoiceNumber: extractedData?.invoice_number || null,
            amount: invoice.amount || 0,
            dueDate: invoice.invoice_date,
            customerEmail: customer.email,
            customerName: customer.name || invoice.merchant || "Πελάτη",
            fileUrl,
        };

        const template = EMAIL_TEMPLATES.newInvoice(emailData);
        const success = await sendEmail(customer.email, template.subject, template.body, fileUrl);

        if (success) {
            toast.success("Το email στάλθηκε επιτυχώς!");

            // Create notification
            await supabase.from("notifications").insert({
                type: "success",
                title: "Email Αποστάλθηκε",
                message: `Τιμολόγιο ${emailData.invoiceNumber || invoice.id} στάλθηκε στον ${customer.name}`,
                link_url: `/packages`,
            });
        } else {
            toast.error("Σφάλμα αποστολής email");
        }

        return success;
    } catch (error) {
        console.error("Error sending invoice email:", error);
        toast.error("Σφάλμα αποστολής email");
        return false;
    }
}

/**
 * Send payment reminder
 */
export async function sendPaymentReminder(invoiceId: string, daysPastDue: number): Promise<boolean> {
    try {
        const { data: invoice, error } = await supabase
            .from("invoices")
            .select(`
        id, amount, extracted_data,
        customers (id, name, email)
      `)
            .eq("id", invoiceId)
            .single();

        if (error || !invoice) {
            toast.error("Σφάλμα φόρτωσης τιμολογίου");
            return false;
        }

        const customer = invoice.customers as any;
        const rawExtracted = invoice.extracted_data as any;
        const extractedData = rawExtracted?.extracted || rawExtracted;

        if (!customer?.email) {
            toast.error("Ο πελάτης δεν έχει email");
            return false;
        }

        const emailData: ReminderEmailData = {
            invoiceId: invoice.id,
            invoiceNumber: extractedData?.invoice_number || null,
            amount: invoice.amount || 0,
            daysPastDue,
            customerEmail: customer.email,
            customerName: customer.name || "Πελάτη",
        };

        // Choose template based on days overdue
        const template = daysPastDue >= 60
            ? EMAIL_TEMPLATES.overdueNotice(emailData)
            : EMAIL_TEMPLATES.paymentReminder(emailData);

        const success = await sendEmail(customer.email, template.subject, template.body);

        if (success) {
            toast.success("Υπενθύμιση στάλθηκε!");
        }

        return success;
    } catch (error) {
        console.error("Error sending reminder:", error);
        toast.error("Σφάλμα αποστολής υπενθύμισης");
        return false;
    }
}

/**
 * Send bulk payment reminders for all overdue invoices
 */
export async function sendBulkReminders(minDaysPastDue: number = 30): Promise<{
    sent: number;
    failed: number;
}> {
    const today = new Date();
    const thresholdDate = new Date(today);
    thresholdDate.setDate(thresholdDate.getDate() - minDaysPastDue);

    // Get overdue invoices with customer emails
    const { data: invoices } = await supabase
        .from("invoices")
        .select(`
      id, amount, invoice_date, extracted_data,
      customers (id, name, email)
    `)
        .eq("type", "income")
        .lte("invoice_date", thresholdDate.toISOString().split('T')[0]);

    // Get matched invoices
    const { data: matches } = await supabase
        .from("invoice_transaction_matches")
        .select("invoice_id");

    const matchedIds = new Set((matches || []).map(m => m.invoice_id));

    // Filter to unpaid invoices with customer email
    const overdueInvoices = (invoices || []).filter(inv => {
        const customer = inv.customers as any;
        return !matchedIds.has(inv.id) && customer?.email;
    });

    let sent = 0;
    let failed = 0;

    for (const inv of overdueInvoices) {
        const customer = inv.customers as any;
        const invoiceDate = new Date(inv.invoice_date!);
        const daysPastDue = Math.floor((today.getTime() - invoiceDate.getTime()) / (1000 * 60 * 60 * 24));

        const success = await sendPaymentReminder(inv.id, daysPastDue);
        if (success) sent++;
        else failed++;

        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 500));
    }

    toast.success(`Στάλθηκαν ${sent} υπενθυμίσεις${failed > 0 ? `, ${failed} απέτυχαν` : ''}`);

    return { sent, failed };
}
