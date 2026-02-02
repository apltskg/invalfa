import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { encode as base64Encode } from "https://deno.land/std@0.168.0/encoding/base64.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // ============ AUTHENTICATION CHECK ============
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      console.error('[AUTH] Missing or invalid Authorization header');
      return new Response(
        JSON.stringify({ error: 'Unauthorized - missing authentication', transactions: [] }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
      console.error('[CONFIG] Supabase environment variables not configured');
      return new Response(
        JSON.stringify({ error: 'Server configuration error', transactions: [] }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify user authentication
    const authClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } }
    });

    const { data: userData, error: authError } = await authClient.auth.getUser(token);
    if (authError || !userData?.user) {
      console.error('[AUTH] Authentication failed:', authError?.message);
      return new Response(
        JSON.stringify({ error: 'Unauthorized - invalid session', transactions: [] }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log('[AUTH] Authenticated user:', userData.user.email);
    // ============ END AUTHENTICATION CHECK ============

    if (!LOVABLE_API_KEY) {
      console.error('[CONFIG] LOVABLE_API_KEY is not configured');
      return new Response(
        JSON.stringify({ error: 'AI service not configured', transactions: [] }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!SUPABASE_SERVICE_ROLE_KEY) {
      console.error('[CONFIG] SUPABASE_SERVICE_ROLE_KEY is not configured');
      return new Response(
        JSON.stringify({ error: 'Storage service not configured', transactions: [] }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { filePath, fileName } = await req.json();

    // Validate filePath format to prevent path traversal
    if (!filePath || typeof filePath !== 'string') {
      console.error('[VALIDATION] Invalid file path');
      return new Response(
        JSON.stringify({ error: 'Invalid file path', transactions: [] }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const filePathRegex = /^[a-zA-Z0-9\-_\/\.]+$/;
    if (!filePathRegex.test(filePath)) {
      console.error('[VALIDATION] Invalid file path format:', filePath);
      return new Response(
        JSON.stringify({ error: 'Invalid file path format', transactions: [] }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const safeFileName = String(fileName || 'bank-statement').substring(0, 100);
    console.log(`[START] Processing bank PDF: ${safeFileName}`);

    // Use service role key for storage access (after user is authenticated)
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Download PDF bytes and encode as base64
    console.log("[PDF] Downloading PDF bytes for base64 encoding...");
    
    const { data: fileData, error: downloadError } = await supabase.storage
      .from("bank-statements")
      .download(filePath);

    if (downloadError || !fileData) {
      console.error("[PDF] Failed to download PDF:", downloadError?.message);
      return new Response(
        JSON.stringify({ error: 'Unable to access PDF file', transactions: [] }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const arrayBuffer = await fileData.arrayBuffer();
    const base64Data = base64Encode(arrayBuffer);
    const fileSize = arrayBuffer.byteLength;

    console.log(`[PDF] Encoded PDF to base64 (${fileSize} bytes)`);

    // Enhanced system prompt for Greek bank statements
    const systemPrompt = `You are an expert financial auditor. Your JOB is to extract EVERY SINGLE transaction line item from the provided bank statement PDF.

CRITICAL RULES FOR GREEK BANK STATEMENTS:

1. **NUMBER FORMATS (VERY IMPORTANT)**:
   - Greek format: dot (.) = thousands separator, comma (,) = decimal
   - Example: "1.234,56" means 1234.56
   - Example: "-500,00" means -500.00
   - Always convert to standard decimal number

2. **DATE FORMATS**:
   - Greek dates: DD/MM/YYYY or DD.MM.YYYY or DD-MM-YYYY
   - Convert ALL dates to ISO format: YYYY-MM-DD

3. **AMOUNT SIGNS**:
   - CREDITS (Deposits, Πίστωση) = POSITIVE numbers
   - DEBITS (Withdrawals, Χρέωση) = NEGATIVE numbers
   - Look for: +/- signs, CR/DR indicators, or separate Credit/Debit columns

4. **EXHAUSTIVE EXTRACTION**:
   - Do NOT summarize or skip ANY transaction rows
   - If there are 50 transactions, return exactly 50 objects
   - Include ALL transactions even if they seem similar

5. **CLEAN DESCRIPTIONS**:
   - Remove line breaks within descriptions
   - Keep the full description text for matching purposes

6. **IGNORE**:
   - Page numbers, headers, footers
   - "Balance Brought Forward", "Opening Balance", "Closing Balance"
   - "Total", "Σύνολο" summary rows
   - Only extract actual transaction movements

OUTPUT FORMAT:
Return ONLY a JSON array: [{ "date": "YYYY-MM-DD", "description": "full description", "amount": number }]`;

    console.log("[AI] Sending to Gemini 2.5 Flash for extraction...");

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: [
              { 
                type: "text", 
                text: `Extract ALL transactions from this bank statement PDF: ${safeFileName}. Return only the JSON array.` 
              },
              { 
                type: "image_url", 
                image_url: { 
                  url: `data:application/pdf;base64,${base64Data}` 
                } 
              }
            ]
          }
        ],
      }),
    });

    if (!response.ok) {
      const errorStatus = response.status;
      console.error(`[AI] Gateway error: ${errorStatus}`);

      if (errorStatus === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again.", transactions: [] }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (errorStatus === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits exhausted.", transactions: [] }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ transactions: [] }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const aiResponse = await response.json();
    console.log("[AI] Response received successfully");
    
    const content = aiResponse.choices?.[0]?.message?.content || "";
    console.log("[AI] Raw content length:", content.length);

    // Clean up markdown code blocks if present
    const cleanContent = content.replace(/```json\n?|\n?```/g, "").trim();

    // Try finding array bracket
    const jsonMatch = cleanContent.match(/\[[\s\S]*\]/);

    if (jsonMatch) {
      try {
        const transactions = JSON.parse(jsonMatch[0]);
        console.log(`[EXTRACTED] Found ${transactions.length} transactions`);
        
        // Log first few transactions for debugging
        if (transactions.length > 0) {
          console.log("[SAMPLE] First transaction:", JSON.stringify(transactions[0]));
        }
        
        return new Response(
          JSON.stringify({ transactions }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      } catch (e) {
        console.error("[AI] JSON Parse Error:", e);
      }
    }

    console.log("[AI] No transactions extracted");
    return new Response(
      JSON.stringify({ transactions: [] }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("[ERROR] Extraction error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error", transactions: [] }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
