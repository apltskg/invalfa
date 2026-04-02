import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Authentication required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    // Verify auth
    const authClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } }
    });
    const { data: userData, error: authError } = await authClient.auth.getUser(authHeader.replace('Bearer ', ''));
    if (authError || !userData?.user) {
      return new Response(
        JSON.stringify({ error: 'Invalid session' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!LOVABLE_API_KEY) {
      return new Response(
        JSON.stringify({ error: 'AI service not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { month, type } = await req.json();
    // type: "spending" | "duplicates"

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    if (type === "spending") {
      // Fetch invoice data for the month
      const monthStart = `${month}-01`;
      const monthEnd = `${month}-31`;

      const { data: invoices } = await supabase
        .from('invoices')
        .select('amount, type, category, merchant, invoice_date, extracted_data')
        .gte('invoice_date', monthStart)
        .lte('invoice_date', monthEnd);

      if (!invoices || invoices.length === 0) {
        return new Response(
          JSON.stringify({ insights: [{ type: 'info', title: 'Χωρίς δεδομένα', message: 'Δεν υπάρχουν τιμολόγια αυτόν τον μήνα.' }] }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Also fetch previous month for comparison
      const prevDate = new Date(`${month}-01`);
      prevDate.setMonth(prevDate.getMonth() - 1);
      const prevMonth = prevDate.toISOString().slice(0, 7);
      const { data: prevInvoices } = await supabase
        .from('invoices')
        .select('amount, type, category')
        .gte('invoice_date', `${prevMonth}-01`)
        .lte('invoice_date', `${prevMonth}-31`);

      const dataForAI = {
        current_month: month,
        invoices: invoices.map(i => ({
          amount: i.amount,
          type: i.type,
          category: i.category,
          merchant: i.merchant,
          date: i.invoice_date,
        })),
        previous_month_summary: {
          total_expenses: (prevInvoices || []).filter(i => i.type === 'expense').reduce((s, i) => s + (i.amount || 0), 0),
          total_income: (prevInvoices || []).filter(i => i.type === 'income').reduce((s, i) => s + (i.amount || 0), 0),
        }
      };

      const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: [
            {
              role: "system",
              content: `Είσαι οικονομικός αναλυτής ταξιδιωτικού γραφείου. Αναλύεις μηνιαία δεδομένα τιμολογίων.
Δίνεις 3-5 actionable insights στα ελληνικά. Κάθε insight πρέπει να έχει:
- type: "info" | "warning" | "success" 
- title: σύντομος τίτλος (max 8 λέξεις)
- message: συγκεκριμένη παρατήρηση με αριθμούς (max 2 σειρές)

Εστίασε σε: ασυνήθιστες αυξήσεις, top κατηγορίες, σύγκριση με προηγούμενο μήνα, ευκαιρίες εξοικονόμησης, missing data warnings.`
            },
            { role: "user", content: JSON.stringify(dataForAI) }
          ],
          tools: [{
            type: "function",
            function: {
              name: "submit_insights",
              description: "Submit spending insights",
              parameters: {
                type: "object",
                properties: {
                  insights: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        type: { type: "string", enum: ["info", "warning", "success"] },
                        title: { type: "string" },
                        message: { type: "string" },
                      },
                      required: ["type", "title", "message"],
                      additionalProperties: false,
                    },
                  },
                },
                required: ["insights"],
                additionalProperties: false,
              },
            },
          }],
          tool_choice: { type: "function", function: { name: "submit_insights" } },
        }),
      });

      if (!response.ok) {
        if (response.status === 429) {
          return new Response(JSON.stringify({ error: "Rate limit" }), {
            status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
        if (response.status === 402) {
          return new Response(JSON.stringify({ error: "Credits exhausted" }), {
            status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
        throw new Error("AI gateway error");
      }

      const aiResponse = await response.json();
      const toolCall = aiResponse.choices?.[0]?.message?.tool_calls?.[0];

      if (toolCall?.function?.arguments) {
        const parsed = JSON.parse(toolCall.function.arguments);
        return new Response(
          JSON.stringify({ insights: parsed.insights || [] }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ insights: [] }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (type === "duplicates") {
      // Fetch all invoices and let AI find semantic duplicates
      const { data: invoices } = await supabase
        .from('invoices')
        .select('id, merchant, amount, invoice_date, extracted_data, type')
        .order('invoice_date', { ascending: false })
        .limit(200);

      if (!invoices || invoices.length < 2) {
        return new Response(
          JSON.stringify({ duplicates: [] }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const invoiceSummaries = invoices.map((inv, i) => ({
        idx: i,
        merchant: inv.merchant,
        amount: inv.amount,
        date: inv.invoice_date,
        invoice_number: (inv.extracted_data as any)?.invoice_number || (inv.extracted_data as any)?.extracted?.invoice_number,
        tax_id: (inv.extracted_data as any)?.tax_id || (inv.extracted_data as any)?.extracted?.tax_id,
        type: inv.type,
      }));

      const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: [
            {
              role: "system",
              content: `Βρες πιθανά ΔΙΠΛΟΤΥΠΑ τιμολόγια. Σημεία ελέγχου:
- Ίδιος αριθμός τιμολογίου (ακόμα κι αν ο merchant name διαφέρει ελαφρά)
- Ίδιο ποσό + ίδια ημερομηνία + παρόμοιος merchant (πιθανό re-upload)
- Ίδιο ΑΦΜ + ίδιο ποσό + κοντινή ημερομηνία
- Λάβε υπόψη πως τα ελληνικά εμπορικά ονόματα μπορεί να αναγράφονται διαφορετικά (π.χ. "Aegean" vs "ΑΕΡΟΠΟΡΙΑ ΑΙΓΑΙΟΥ")
Επίστρεψε ΜΟΝΟ τα πραγματικά ύποπτα ζεύγη.`
            },
            { role: "user", content: JSON.stringify(invoiceSummaries) }
          ],
          tools: [{
            type: "function",
            function: {
              name: "submit_duplicates",
              description: "Submit found duplicate pairs",
              parameters: {
                type: "object",
                properties: {
                  duplicates: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        index_a: { type: "number" },
                        index_b: { type: "number" },
                        confidence: { type: "number", description: "0-100" },
                        reason: { type: "string", description: "Greek explanation" },
                      },
                      required: ["index_a", "index_b", "confidence", "reason"],
                      additionalProperties: false,
                    },
                  },
                },
                required: ["duplicates"],
                additionalProperties: false,
              },
            },
          }],
          tool_choice: { type: "function", function: { name: "submit_duplicates" } },
        }),
      });

      if (!response.ok) {
        if (response.status === 429) {
          return new Response(JSON.stringify({ error: "Rate limit" }), {
            status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
        if (response.status === 402) {
          return new Response(JSON.stringify({ error: "Credits exhausted" }), {
            status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
        throw new Error("AI gateway error");
      }

      const aiResponse = await response.json();
      const toolCall = aiResponse.choices?.[0]?.message?.tool_calls?.[0];

      if (toolCall?.function?.arguments) {
        const parsed = JSON.parse(toolCall.function.arguments);
        const results = (parsed.duplicates || [])
          .filter((d: any) => d.confidence >= 60)
          .map((d: any) => ({
            invoiceA: invoices[d.index_a]?.id,
            invoiceB: invoices[d.index_b]?.id,
            merchantA: invoices[d.index_a]?.merchant,
            merchantB: invoices[d.index_b]?.merchant,
            amountA: invoices[d.index_a]?.amount,
            amountB: invoices[d.index_b]?.amount,
            confidence: d.confidence,
            reason: d.reason,
          }))
          .filter((d: any) => d.invoiceA && d.invoiceB);

        return new Response(
          JSON.stringify({ duplicates: results }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ duplicates: [] }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: "Unknown type" }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error("[AI-INSIGHTS] Error:", error);
    return new Response(
      JSON.stringify({ error: "Internal error" }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
