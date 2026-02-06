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
    // Verify authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      console.error("[AUTH] Missing or invalid Authorization header");
      return new Response(
        JSON.stringify({ error: 'Authentication required', code: 'AUTH_REQUIRED', extracted: null }),
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
      console.error("[AUTH] Invalid session");
      return new Response(
        JSON.stringify({ error: 'Invalid session', code: 'INVALID_SESSION', extracted: null }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { filePath, fileName } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!LOVABLE_API_KEY) {
      console.error("[CONFIG] LOVABLE_API_KEY is not configured");
      return new Response(
        JSON.stringify({ error: 'AI service not configured', code: 'CONFIG_ERROR', extracted: null }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!filePath || typeof filePath !== 'string') {
      console.error("[VALIDATION] Invalid file reference");
      return new Response(
        JSON.stringify({ error: 'Invalid file reference', code: 'INVALID_FILE', extracted: null }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Stricter file path validation - only allow uploads directory with expected format
    if (!filePath.match(/^uploads\/[0-9]+-[a-z0-9]+\.(pdf|png|jpg|jpeg|webp)$/i)) {
      console.error('[VALIDATION] Invalid file path format');
      return new Response(
        JSON.stringify({ error: 'Invalid file path format', code: 'INVALID_PATH', extracted: null }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const safeFileName = String(fileName || 'document').substring(0, 100);
    const fileExtension = filePath.split('.').pop()?.toLowerCase() || '';
    const isPDF = fileExtension === 'pdf';

    console.log(`[START] Processing invoice: ${safeFileName} (type: ${fileExtension})`);

    // Create service role client to access storage
    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

    // For PDFs: download bytes and send as base64
    // For images: use signed URL directly
    let contentPayload: any;

    if (isPDF) {
      console.log("[PDF] Downloading PDF bytes for base64 encoding...");

      const { data: fileData, error: downloadError } = await supabase.storage
        .from("invoices")
        .download(filePath);

      if (downloadError || !fileData) {
        console.error("[PDF] Failed to download PDF:", downloadError?.message);
        return new Response(
          JSON.stringify({ error: 'Unable to access PDF file', code: 'FILE_ACCESS_ERROR', extracted: null }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const arrayBuffer = await fileData.arrayBuffer();
      const base64Data = base64Encode(arrayBuffer);
      const fileSize = arrayBuffer.byteLength;

      console.log(`[PDF] Encoded PDF to base64 (${fileSize} bytes)`);

      contentPayload = [
        {
          type: "text",
          text: `Extract invoice data from this PDF document: ${safeFileName}`
        },
        {
          type: "image_url",
          image_url: {
            url: `data:application/pdf;base64,${base64Data}`
          }
        }
      ];
    } else {
      // For images, use signed URL
      console.log("[IMAGE] Generating signed URL for image...");

      const { data: signedUrlData, error: signedUrlError } = await supabase.storage
        .from("invoices")
        .createSignedUrl(filePath, 300);

      if (signedUrlError || !signedUrlData?.signedUrl) {
        console.error("[IMAGE] Failed to create signed URL");
        return new Response(
          JSON.stringify({ error: 'Unable to access file', code: 'FILE_ACCESS_ERROR', extracted: null }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      contentPayload = [
        {
          type: "text",
          text: `Extract invoice data from this image: ${safeFileName}`
        },
        {
          type: "image_url",
          image_url: { url: signedUrlData.signedUrl }
        }
      ];
    }

    console.log("[AI] Sending to Gemini 2.5 Flash for extraction...");

    // Enhanced system prompt for Greek documents - AGGRESSIVE EXTRACTION
    const systemPrompt = `You are an expert financial auditor specializing in Greek and European tax documents.
Your task is to ACCURATELY extract ALL invoice data. Be AGGRESSIVE in finding the correct values.

CRITICAL RULES FOR GREEK INVOICES:

1. **NUMBER FORMATS (EXTREMELY IMPORTANT)**:
   - Greek format uses DOT (.) for thousands and COMMA (,) for decimals
   - "1.234,56" = 1234.56 (NOT 1.23456 or 1234.56)
   - "12.500,00" = 12500.00
   - "500,00" = 500.00
   - "-1.234,56" = -1234.56
   - ALWAYS convert to standard decimal format in your response

2. **DATE FORMATS**:
   - Greek dates: DD/MM/YYYY or DD.MM.YYYY or DD-MM-YYYY
   - Convert ALL dates to ISO format: YYYY-MM-DD
   - Example: 15/03/2026 → 2026-03-15

3. **MERCHANT NAME (IMPORTANT)**:
   - ALWAYS prefer the BRAND/TRADING name over legal entity
   - "Aegean Airlines" NOT "ΑΕΡΟΠΟΡΙΑ ΑΙΓΑΙΟΥ Α.Ε."
   - "Vodafone" NOT "Vodafone-Panafon Α.Ε.Ε.Τ."
   - "Cosmote" NOT "COSMOTE - ΚΙΝΗΤΕΣ ΤΗΛΕΠΙΚΟΙΝΩΝΙΕΣ Α.Ε."
   - Look for logos, brand names at the top of document
   - Look for: ΕΠΩΝΥΜΙΑ, Πωλητής, Εκδότης, Προμηθευτής

4. **VAT/TAX ID (ΑΦΜ)**:
   - Greek VAT numbers are EXACTLY 9 digits
   - Look for: ΑΦΜ, Α.Φ.Μ., Tax ID, VAT Number, TIN
   - Extract ONLY the 9-digit number, no prefixes

5. **AMOUNTS (CRITICAL)**:
   - Extract the FINAL TOTAL (Σύνολο Πληρωμής, Grand Total) INCLUDING VAT
   - This is usually the LARGEST amount on the invoice
   - NOT the net amount (Καθαρή Αξία)
   - Look for: ΣΥΝΟΛΟ, Πληρωτέο, Total, Σύνολο με ΦΠΑ, Πληρωτέο Ποσό
   - If multiple totals exist, use the FINAL one (bottom of invoice)

6. **CATEGORIES** (choose the BEST match):
   - "airline": Αεροπορικά, Aegean, Sky Express, Ryanair, Olympic, Volotea, boarding pass, flight, ticket
   - "hotel": Ξενοδοχείο, διαμονή, Airbnb, Booking.com, Hotels.com, accommodation, room, stay
   - "tolls": Διόδια, Attiki Odos, Egnatia, Gefyra, Olympia Odos, Moreas, Ionia Odos, e-pass, motorway
   - "other": Everything else (taxi, fuel, restaurant, parking, supplies, software, services, utilities, telecom)

7. **INVOICE NUMBER**:
   - Look for: Αριθμός Τιμολογίου, Αρ. Παραστατικού, Invoice No, Receipt No, Σειρά/Αριθμός
   - Include the full number with any prefix letters

REMEMBER: Extract EXACTLY what you see. Convert numbers correctly. Be precise.`;
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
          { role: "user", content: contentPayload }
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
                    description: "Company or vendor name (prefer trading name over legal entity)"
                  },
                  tax_id: {
                    type: "string",
                    description: "The 9-digit Greek VAT number (ΑΦΜ) or equivalent Tax ID"
                  },
                  amount: {
                    type: "number",
                    description: "Total amount paid (final price INCLUDING VAT) as a decimal number"
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
                    description: "VAT/tax amount if visible as a decimal number"
                  },
                  invoice_number: {
                    type: "string",
                    description: "Invoice or receipt number"
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
      const errorStatus = response.status;
      console.error(`[AI] Gateway error: ${errorStatus}`);

      if (errorStatus === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment.", code: 'RATE_LIMIT', extracted: null }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (errorStatus === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits exhausted. Please add credits to continue.", code: 'CREDITS_EXHAUSTED', extracted: null }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      console.error("[AI] Returning low-confidence fallback");
      return new Response(
        JSON.stringify({
          extracted: { merchant: null, amount: null, date: null, category: "other", confidence: 0.1 }
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const aiResponse = await response.json();
    console.log("[AI] Response received successfully");

    // Extract from tool call response
    const toolCall = aiResponse.choices?.[0]?.message?.tool_calls?.[0];

    if (toolCall?.function?.arguments) {
      try {
        const parsed = JSON.parse(toolCall.function.arguments);

        console.log("[EXTRACTED] merchant:", parsed.merchant);
        console.log("[EXTRACTED] amount:", parsed.amount);
        console.log("[EXTRACTED] date:", parsed.date);
        console.log("[EXTRACTED] category:", parsed.category);
        console.log("[EXTRACTED] tax_id:", parsed.tax_id);
        console.log("[EXTRACTED] invoice_number:", parsed.invoice_number);

        return new Response(
          JSON.stringify({
            extracted: {
              merchant: parsed.merchant || null,
              tax_id: parsed.tax_id || null,
              amount: typeof parsed.amount === 'number' ? parsed.amount : null,
              date: parsed.date || null,
              category: parsed.category || "other",
              currency: parsed.currency || "EUR",
              vat_amount: typeof parsed.vat_amount === 'number' ? parsed.vat_amount : null,
              invoice_number: parsed.invoice_number || null,
              confidence: 0.9
            }
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      } catch (parseError) {
        console.error("[AI] Failed to parse tool call arguments:", parseError);
      }
    }

    // Fallback: try to parse from regular content
    const content = aiResponse.choices?.[0]?.message?.content;
    if (content) {
      console.log("[AI] Attempting fallback content parsing...");

      // Clean up markdown code blocks if present (like in bank extractor)
      const cleanContent = content.replace(/```json\n?|\n?```/g, "").trim();

      const jsonMatch = cleanContent.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          const parsed = JSON.parse(jsonMatch[0]);
          console.log("[FALLBACK] Extracted data from content");
          return new Response(
            JSON.stringify({
              extracted: {
                merchant: parsed.merchant || null,
                tax_id: parsed.tax_id || null,
                amount: parsed.amount ? parseFloat(parsed.amount) : null,
                date: parsed.date || null,
                category: parsed.category || "other",
                currency: parsed.currency || "EUR",
                invoice_number: parsed.invoice_number || null,
                confidence: 0.7
              }
            }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        } catch (e) {
          console.error("[FALLBACK] JSON parse failed:", e);
        }
      }
    }

    console.log("[AI] No structured data extracted, returning low confidence");
    return new Response(
      JSON.stringify({
        extracted: { merchant: null, amount: null, date: null, category: "other", confidence: 0.1 }
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("[ERROR] Extraction error:", error);
    return new Response(
      JSON.stringify({
        error: "Unable to process document. Please try again.",
        code: 'EXTRACTION_ERROR',
        extracted: null
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
