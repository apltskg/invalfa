import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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
      console.error('Missing or invalid Authorization header');
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
      console.error('Supabase environment variables not configured');
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
      console.error('Authentication failed:', authError?.message);
      return new Response(
        JSON.stringify({ error: 'Unauthorized - invalid session', transactions: [] }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log('Authenticated user:', userData.user.email);
    // ============ END AUTHENTICATION CHECK ============

    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    if (!SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error("SUPABASE_SERVICE_ROLE_KEY is not configured");
    }

    const { filePath, fileName } = await req.json();

    // Validate filePath format to prevent path traversal
    if (!filePath || typeof filePath !== 'string') {
      return new Response(
        JSON.stringify({ error: 'Invalid file path', transactions: [] }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const filePathRegex = /^[a-zA-Z0-9\-_\/\.]+$/;
    if (!filePathRegex.test(filePath)) {
      console.error('Invalid file path format:', filePath);
      return new Response(
        JSON.stringify({ error: 'Invalid file path format', transactions: [] }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Processing bank PDF:", fileName);

    // Use service role key for storage access (after user is authenticated)
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { data: signedUrlData, error: signedUrlError } = await supabase.storage
      .from("bank-statements")
      .createSignedUrl(filePath, 300);

    if (signedUrlError || !signedUrlData?.signedUrl) {
      throw new Error("Failed to access PDF in storage");
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.0-flash-exp",
        messages: [
          {
            role: "system",
            content: `You are an expert financial auditor. Your JOB is to extract EVERY SINGLE transaction line item from the provided bank statement PDF.
            
            OUTPUT FORMAT:
            A JSON Array of objects: [{ "date": "YYYY-MM-DD", "description": "full description text", "amount": number }]

            STRICT RULES:
            1. **Exhaustive Extraction**: Do NOT summarize. Do NOT skip any rows. If there are 50 transactions, return 50 objects.
            2. **Dates**: Convert all dates to YYYY-MM-DD.
            3. **Amounts**: 
               - Parse Greek/European formats correctly (e.g. "1.234,56" is 1234.56).
               - CREDITS (Deposits) are POSITIVE.
               - DEBITS (Withdrawals) are NEGATIVE.
            4. **Clean Descriptions**: Remove line breaks within a description.
            5. **Ignore**: Page numbers, headers, "Balance Brought Forward", "Total", etc. Only extract actual movements.`
          },
          {
            role: "user",
            content: [
              { type: "text", text: `Extract all transactions from this bank statement PDF. Return JSON array only.` },
              { type: "image_url", image_url: { url: signedUrlData.signedUrl } }
            ]
          }
        ],
      }),
    });

    if (!response.ok) {
      console.error("AI error:", response.status);
      return new Response(JSON.stringify({ transactions: [] }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const aiResponse = await response.json();
    console.log("AI Response full:", JSON.stringify(aiResponse));
    const content = aiResponse.choices?.[0]?.message?.content || "";
    console.log("AI Raw Content:", content);

    // Clean up markdown code blocks if present
    const cleanContent = content.replace(/```json\n?|\n?```/g, "").trim();

    // Try finding array bracket
    const jsonMatch = cleanContent.match(/\[[\s\S]*\]/);

    if (jsonMatch) {
      try {
        const transactions = JSON.parse(jsonMatch[0]);
        console.log("Parsed transactions:", transactions.length);
        return new Response(JSON.stringify({ transactions }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      } catch (e) {
        console.error("JSON Parse Error:", e);
      }
    }

    return new Response(JSON.stringify({ transactions: [] }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (error) {
    console.error("Error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error", transactions: [] }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
