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

    const { transactions, invoices } = await req.json();

    if (!transactions?.length || !invoices?.length) {
      return new Response(
        JSON.stringify({ matches: [] }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Limit to 20 transactions and 50 invoices per request
    const txnSlice = transactions.slice(0, 20);
    const invSlice = invoices.slice(0, 50);

    const systemPrompt = `You are an expert Greek travel agency accountant performing bank reconciliation.
You must match bank transactions to invoices based on amount, date, merchant name, VAT number, and context.

RULES:
- A transaction can match AT MOST one invoice
- An invoice can match AT MOST one transaction
- Credit transactions (positive amounts) match INCOME invoices
- Debit transactions (negative amounts) match EXPENSE invoices
- Greek number format: 1.234,56 = 1234.56
- Bank descriptions often abbreviate merchant names
- Consider bank fees (±2% tolerance on amounts)
- VAT (ΑΦΜ) appearing in both is a VERY strong match signal
- Same date ±3 days with matching amount is strong
- Return confidence 0-100 for each match`;

    const userPrompt = `Match these bank transactions to invoices:

BANK TRANSACTIONS:
${txnSlice.map((t: any, i: number) => `[T${i}] ${t.date} | ${t.amount}€ | "${t.description}"`).join('\n')}

INVOICES:
${invSlice.map((inv: any, i: number) => `[I${i}] ${inv.date} | ${inv.amount}€ | ${inv.type} | "${inv.merchant}" | VAT: ${inv.tax_id || 'N/A'} | #${inv.invoice_number || 'N/A'}`).join('\n')}

Return matches as structured data.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        tools: [{
          type: "function",
          function: {
            name: "submit_matches",
            description: "Submit the matched transaction-invoice pairs",
            parameters: {
              type: "object",
              properties: {
                matches: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      transaction_index: { type: "number", description: "Index of the transaction (T0, T1, ...)" },
                      invoice_index: { type: "number", description: "Index of the invoice (I0, I1, ...)" },
                      confidence: { type: "number", description: "Match confidence 0-100" },
                      reason: { type: "string", description: "Brief Greek reason for the match" },
                    },
                    required: ["transaction_index", "invoice_index", "confidence", "reason"],
                    additionalProperties: false,
                  },
                },
              },
              required: ["matches"],
              additionalProperties: false,
            },
          },
        }],
        tool_choice: { type: "function", function: { name: "submit_matches" } },
      }),
    });

    if (!response.ok) {
      const status = response.status;
      if (status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded" }), {
          status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (status === 402) {
        return new Response(JSON.stringify({ error: "Credits exhausted" }), {
          status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      return new Response(JSON.stringify({ error: "AI matching failed", matches: [] }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const aiResponse = await response.json();
    const toolCall = aiResponse.choices?.[0]?.message?.tool_calls?.[0];

    if (toolCall?.function?.arguments) {
      try {
        const parsed = JSON.parse(toolCall.function.arguments);
        const validMatches = (parsed.matches || [])
          .filter((m: any) => 
            m.transaction_index >= 0 && m.transaction_index < txnSlice.length &&
            m.invoice_index >= 0 && m.invoice_index < invSlice.length &&
            m.confidence >= 50
          )
          .map((m: any) => ({
            transactionId: txnSlice[m.transaction_index].id,
            invoiceId: invSlice[m.invoice_index].id,
            confidence: m.confidence,
            reason: m.reason,
          }));

        console.log(`[AI-MATCH] Found ${validMatches.length} matches`);

        return new Response(
          JSON.stringify({ matches: validMatches }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      } catch (e) {
        console.error("[AI-MATCH] Parse error:", e);
      }
    }

    return new Response(
      JSON.stringify({ matches: [] }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error("[AI-MATCH] Error:", error);
    return new Response(
      JSON.stringify({ error: "Internal error", matches: [] }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
