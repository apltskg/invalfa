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
    // Verify authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized', extracted: null }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY");

    const authClient = createClient(SUPABASE_URL!, SUPABASE_ANON_KEY!, {
      global: { headers: { Authorization: authHeader } }
    });

    const token = authHeader.replace('Bearer ', '');
    const { data: claimsData, error: claimsError } = await authClient.auth.getUser(token);

    if (claimsError || !claimsData?.user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized', extracted: null }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { filePath, fileName } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    if (!filePath || typeof filePath !== 'string') {
      return new Response(
        JSON.stringify({ error: 'Invalid filePath parameter', extracted: null }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate filePath format
    if (!filePath.match(/^[a-zA-Z0-9_-]+\/[0-9]+-[a-z0-9]+\.(pdf|png|jpg|jpeg|webp)$/i)) {
      return new Response(
        JSON.stringify({ error: 'Invalid file path format', extracted: null }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[${claimsData.user.email}] Processing invoice:`, fileName, "Path:", filePath);

    // Create service role client to access storage
    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

    // Generate a signed URL server-side for the AI to access
    const { data: signedUrlData, error: signedUrlError } = await supabase.storage
      .from("invoices")
      .createSignedUrl(filePath, 300); // 5 minutes for AI processing

    if (signedUrlError || !signedUrlData?.signedUrl) {
      console.error("Failed to create signed URL:", signedUrlError);
      throw new Error("Failed to access file in storage");
    }

    const fileUrl = signedUrlData.signedUrl;
    console.log("Generated server-side signed URL for AI");

    // Use tool calling for structured extraction
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
            content: `You are an expert financial auditor specializing in Greek and European tax documents.
            Analyze the document and extract structured data meticulously.
            
            KEY RULES:
            - **Merchant Name**: Prefer the "Trading Name" (e.g., "Aegean Airlines") over the legal name ("AEROPOIRIA AIGAIOU A.E.").
            - **Greek Characters**: If the merchant name is in Greek, provide the transliterated or common English version if possible, otherwise keep the Greek name.
            - **VAT/AFM**: Look for "ΑΦΜ" (Tax ID). Valid Greek VATs have 9 digits.
            - **Amounts**: Always extract the **Total Payable Amount** (Final Amount including VAT). Ignore "Net Amount" or "Subtotal" unless asking for breakdown.
            - **Dates**: Convert all dates (DD/MM/YYYY, DD.MM.YY) to ISO format: YYYY-MM-DD.
            
            CATEGORIES:
            - "airline": Tickets, Boarding passes, Aegean, Sky Express, Ryanair, Volotea, Lufthansa.
            - "hotel": Accommodation, Airbnb, Booking.com, Hotels.com, Marriott, Hilton.
            - "tolls": Attiki Odos, Egnatia Odos, Gefyra, Olympia Odos, Moreas, Ionia Odos.
            - "other": EVERYTHING else. Taxis (Uber, FreeNow), Fuel (Shell, EKO, BP), Restaurants, Parking, Amazon, Software.`
          },
          {
            role: "user",
            content: [
              {
                type: "text",
                text: `Extremely accurately extract merchant, total amount (incl. VAT), invoice date, category, and tax_id (ΑΦΜ) from this document: ${fileName}`
              },
              {
                type: "image_url",
                image_url: { url: fileUrl }
              }
            ]
          }
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "extract_invoice_data",
              description: "Extract structured data from an invoice document",
              parameters: {
                type: "object",
                properties: {
                  merchant: {
                    type: "string",
                    description: "Company or vendor name (e.g., 'Aegean Airlines')"
                  },
                  tax_id: {
                    type: "string",
                    description: "The 9-digit Greek VAT number (ΑΦΜ) or equivalent Tax ID"
                  },
                  amount: {
                    type: "number",
                    description: "Total amount paid (final price including VAT)"
                  },
                  currency: {
                    type: "string",
                    description: "Currency code (EUR, USD, GBP, etc.)"
                  },
                  date: {
                    type: "string",
                    description: "Invoice date in YYYY-MM-DD format"
                  },
                  category: {
                    type: "string",
                    enum: ["airline", "hotel", "tolls", "other"],
                    description: "Category based on merchant type"
                  },
                  vat_amount: {
                    type: "number",
                    description: "VAT/tax amount if visible"
                  },
                  invoice_number: {
                    type: "string",
                    description: "Invoice or receipt number if visible"
                  }
                },
                required: ["merchant", "amount", "date", "category"],
                additionalProperties: false
              }
            }
          }
        ],
        tool_choice: { type: "function", function: { name: "extract_invoice_data" } }
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI Gateway error:", response.status, errorText);

      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment.", extracted: null }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits exhausted. Please add credits to continue.", extracted: null }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({
          extracted: { merchant: null, amount: null, date: null, category: "other", confidence: 0.1 }
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const aiResponse = await response.json();
    console.log("AI response received");

    // Extract from tool call response
    const toolCall = aiResponse.choices?.[0]?.message?.tool_calls?.[0];

    if (toolCall?.function?.arguments) {
      const parsed = JSON.parse(toolCall.function.arguments);
      console.log("Parsed extraction:", parsed);

      return new Response(
        JSON.stringify({
          extracted: {
            merchant: parsed.merchant || null,
            amount: parsed.amount ?? null,
            date: parsed.date || null,
            category: parsed.category || "other",
            currency: parsed.currency || "EUR",
            vat_amount: parsed.vat_amount ?? null,
            invoice_number: parsed.invoice_number || null,
            confidence: 0.9
          }
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fallback: try to parse from regular content
    const content = aiResponse.choices?.[0]?.message?.content;
    if (content) {
      console.log("Fallback content parsing");
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return new Response(
          JSON.stringify({
            extracted: {
              merchant: parsed.merchant || null,
              amount: parsed.amount ? parseFloat(parsed.amount) : null,
              date: parsed.date || null,
              category: parsed.category || "other",
              confidence: 0.7
            }
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    console.log("No structured data extracted");
    return new Response(
      JSON.stringify({
        extracted: { merchant: null, amount: null, date: null, category: "other", confidence: 0.1 }
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Extraction error:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Unknown error",
        extracted: null
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
