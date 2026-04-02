import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { encode as base64Encode } from "https://deno.land/std@0.168.0/encoding/base64.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // ============ AUTHENTICATION ============
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized', transactions: [], detected_bank: null }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    const authClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } }
    });
    const { data: userData, error: authError } = await authClient.auth.getUser(token);
    if (authError || !userData?.user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized', transactions: [], detected_bank: null }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!LOVABLE_API_KEY) {
      return new Response(
        JSON.stringify({ error: 'AI service not configured', transactions: [], detected_bank: null }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { filePath, fileName } = await req.json();

    if (!filePath || typeof filePath !== 'string') {
      return new Response(
        JSON.stringify({ error: 'Invalid file path', transactions: [], detected_bank: null }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const safeFileName = String(fileName || 'bank-statement').substring(0, 100);
    console.log(`[START] Processing bank PDF: ${safeFileName}`);

    // Download PDF bytes and encode as base64
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { data: fileData, error: downloadError } = await supabase.storage
      .from("bank-statements")
      .download(filePath);

    if (downloadError || !fileData) {
      console.error("[PDF] Failed to download PDF:", downloadError?.message);
      return new Response(
        JSON.stringify({ error: 'Unable to access PDF file', transactions: [], detected_bank: null }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const arrayBuffer = await fileData.arrayBuffer();
    const base64Data = base64Encode(arrayBuffer);
    console.log(`[PDF] Encoded to base64 (${arrayBuffer.byteLength} bytes)`);

    const systemPrompt = `You are an expert financial auditor specializing in Greek bank statements.

BANK IDENTIFICATION:
- Eurobank: Look for "EUROBANK", burgundy/red colors
- Alpha Bank: Look for "ALPHA BANK", "ΑΛΦΑ ΤΡΑΠΕΖΑ", blue branding
- Viva Wallet: Look for "VIVA WALLET", "VIVA", green branding
- Wise: Look for "WISE", "TransferWise", teal/blue-green branding

CRITICAL RULES:
1. NUMBER FORMATS: Greek format uses dot (.) for thousands and comma (,) for decimals
   - "1.234,56" = 1234.56, "-500,00" = -500.00
   - Always output standard decimal numbers

2. DATES: Greek format DD/MM/YYYY → convert to ISO YYYY-MM-DD

3. SIGNS:
   - CREDITS (Πίστωση, deposits, incoming) = POSITIVE numbers
   - DEBITS (Χρέωση, withdrawals, outgoing) = NEGATIVE numbers

4. EXHAUSTIVE: Extract EVERY SINGLE transaction row. Do NOT summarize or skip any.

5. IGNORE: Page numbers, headers, footers, opening/closing balances, total rows.

Extract ALL transactions with zero exceptions.`;

    console.log("[AI] Sending to Gemini 2.5 Flash with tool calling...");

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
          {
            role: "user",
            content: [
              {
                type: "text",
                text: `Analyze this bank statement PDF: "${safeFileName}". Identify the bank and extract ALL transactions.`
              },
              {
                type: "image_url",
                image_url: { url: `data:application/pdf;base64,${base64Data}` }
              }
            ]
          }
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "extract_bank_transactions",
              description: "Extract all transactions from a bank statement PDF",
              parameters: {
                type: "object",
                properties: {
                  detected_bank: {
                    type: "string",
                    enum: ["eurobank", "alpha", "viva", "wise"],
                    description: "The bank identified from the statement"
                  },
                  transactions: {
                    type: "array",
                    description: "ALL transaction rows extracted from the statement",
                    items: {
                      type: "object",
                      properties: {
                        date: {
                          type: "string",
                          description: "Transaction date in YYYY-MM-DD format"
                        },
                        description: {
                          type: "string",
                          description: "Full transaction description/narration"
                        },
                        amount: {
                          type: "number",
                          description: "Amount as decimal. POSITIVE for credits/deposits, NEGATIVE for debits/withdrawals"
                        }
                      },
                      required: ["date", "description", "amount"],
                      additionalProperties: false
                    }
                  }
                },
                required: ["transactions"],
                additionalProperties: false
              }
            }
          }
        ],
        tool_choice: { type: "function", function: { name: "extract_bank_transactions" } }
      }),
    });

    if (!response.ok) {
      const errorStatus = response.status;
      console.error(`[AI] Gateway error: ${errorStatus}`);

      if (errorStatus === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again.", transactions: [], detected_bank: null }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (errorStatus === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits exhausted.", transactions: [], detected_bank: null }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ error: "AI gateway error", transactions: [], detected_bank: null }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const aiResponse = await response.json();
    console.log("[AI] Response received");

    // Extract from tool call (primary path)
    const toolCall = aiResponse.choices?.[0]?.message?.tool_calls?.[0];

    if (toolCall?.function?.arguments) {
      try {
        const parsed = JSON.parse(toolCall.function.arguments);
        const transactions = Array.isArray(parsed.transactions) ? parsed.transactions : [];
        const detected_bank = parsed.detected_bank || null;

        console.log(`[EXTRACTED] Bank: ${detected_bank}, Transactions: ${transactions.length}`);
        if (transactions.length > 0) {
          console.log("[SAMPLE]", JSON.stringify(transactions[0]));
        }

        return new Response(
          JSON.stringify({ transactions, detected_bank }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      } catch (parseError) {
        console.error("[AI] Failed to parse tool call arguments:", parseError);
      }
    }

    // Fallback: try raw content JSON parsing
    const content = aiResponse.choices?.[0]?.message?.content || "";
    console.log("[AI] Fallback: parsing raw content...");
    const cleanContent = content.replace(/```json\n?|\n?```/g, "").trim();

    let detected_bank: string | null = null;
    let transactions: any[] = [];

    try {
      const jsonMatch = cleanContent.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        if (parsed.detected_bank) detected_bank = String(parsed.detected_bank).toLowerCase();
        if (Array.isArray(parsed.transactions)) transactions = parsed.transactions;
      }
    } catch (e) {
      const arrayMatch = cleanContent.match(/\[[\s\S]*\]/);
      if (arrayMatch) {
        try { transactions = JSON.parse(arrayMatch[0]); } catch {}
      }
    }

    console.log(`[FALLBACK] Bank: ${detected_bank}, Transactions: ${transactions.length}`);
    return new Response(
      JSON.stringify({ transactions, detected_bank }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("[ERROR]", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error", transactions: [], detected_bank: null }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
