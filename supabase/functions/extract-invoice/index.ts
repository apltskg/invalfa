import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { encode as base64Encode } from "https://deno.land/std@0.168.0/encoding/base64.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Tool definition shared across attempts
const extractionTool = {
  type: "function" as const,
  function: {
    name: "extract_invoice_data",
    description: "Extract structured data from an invoice document",
    parameters: {
      type: "object",
      properties: {
        merchant: { type: "string", description: "Seller/vendor company or brand name (prefer trading name)" },
        tax_id: { type: "string", description: "Seller's 9-digit Greek VAT number (ΑΦΜ Πωλητή)" },
        buyer_name: { type: "string", description: "Buyer company name (Αγοραστής)" },
        buyer_vat: { type: "string", description: "Buyer's 9-digit Greek VAT number (ΑΦΜ Αγοραστή)" },
        amount: { type: "number", description: "Total amount INCLUDING VAT (Σύνολο Πληρωμής) as decimal" },
        net_amount: { type: "number", description: "Net amount BEFORE VAT (Καθαρή Αξία) as decimal" },
        currency: { type: "string", description: "Currency code (EUR, USD, GBP, etc.)" },
        date: { type: "string", description: "Invoice date in YYYY-MM-DD format" },
        category: {
          type: "string",
          enum: ["airline", "hotel", "tolls", "fuel", "transport", "payroll", "government", "rent", "telecom", "insurance", "office", "maintenance", "marketing", "other"],
          description: "Expense category based on merchant/service type"
        },
        vat_amount: { type: "number", description: "VAT amount (ΦΠΑ) as decimal" },
        vat_rate: { type: "number", description: "VAT rate percentage (e.g. 24, 13, 6)" },
        invoice_number: { type: "string", description: "Invoice or receipt number" },
        document_type: {
          type: "string",
          enum: ["invoice", "receipt", "credit_note", "proforma"],
          description: "Type of document"
        },
        ocr_quality: {
          type: "string",
          enum: ["clear", "readable", "partial", "poor"],
          description: "Overall readability quality of the document image"
        },
        ocr_issues: {
          type: "array",
          items: { type: "string" },
          description: "List of OCR/readability issues detected: blurry_text, skewed, low_contrast, faded_ink, partial_crop, handwritten, stamp_overlay, small_font"
        }
      },
      required: ["merchant", "amount", "date", "category", "ocr_quality"],
      additionalProperties: false
    }
  }
};

// Dynamic confidence scoring based on extracted fields + OCR quality
const calculateConfidence = (parsed: any): number => {
  let score = 0;
  let total = 0;
  const fields = [
    { key: 'merchant', weight: 2 },
    { key: 'amount', weight: 3 },
    { key: 'date', weight: 2 },
    { key: 'tax_id', weight: 2 },
    { key: 'invoice_number', weight: 1.5 },
    { key: 'vat_amount', weight: 1 },
    { key: 'net_amount', weight: 1 },
    { key: 'category', weight: 0.5 },
  ];
  for (const f of fields) {
    total += f.weight;
    if (parsed[f.key] != null && parsed[f.key] !== '' && parsed[f.key] !== 'other') {
      score += f.weight;
    }
  }
  let confidence = score / total;

  // Apply OCR quality penalty
  const qualityPenalty: Record<string, number> = {
    clear: 0,
    readable: 0.05,
    partial: 0.15,
    poor: 0.30,
  };
  confidence -= qualityPenalty[parsed.ocr_quality] || 0;

  // Additional penalty per issue detected
  const issueCount = parsed.ocr_issues?.length || 0;
  confidence -= issueCount * 0.02;

  return Math.round(Math.max(0.05, Math.min(1, confidence)) * 100) / 100;
};

// Sanitize VAT numbers
const sanitizeVat = (raw: string | null | undefined): string | null => {
  if (!raw) return null;
  const cleaned = String(raw).replace(/[^0-9]/g, '');
  return cleaned.length === 9 ? cleaned : null;
};

// System prompt for Greek documents
const baseSystemPrompt = `You are an expert financial auditor specializing in Greek travel agency invoices and European tax documents.
Your task is to ACCURATELY extract ALL invoice data. Be AGGRESSIVE in finding the correct values.

CRITICAL RULES FOR GREEK INVOICES:

1. **NUMBER FORMATS (EXTREMELY IMPORTANT)**:
   - Greek format uses DOT (.) for thousands and COMMA (,) for decimals
   - "1.234,56" = 1234.56 (NOT 1.23456 or 1234.56)
   - "12.500,00" = 12500.00
   - "500,00" = 500.00
   - ALWAYS convert to standard decimal format in your response

2. **DATE FORMATS**:
   - Greek dates: DD/MM/YYYY or DD.MM.YYYY or DD-MM-YYYY
   - Convert ALL dates to ISO format: YYYY-MM-DD

3. **TWO PARTIES ON EVERY INVOICE**:
   - SELLER (Πωλητής/Εκδότης): the company that ISSUED the invoice
   - BUYER (Αγοραστής/Πελάτης): the company that RECEIVED/PAID
   - Extract NAME and ΑΦΜ (VAT number) for BOTH parties
   - The MERCHANT is the SELLER (who we paid / who issued the invoice)
   - The BUYER is usually us (the travel agency receiving the invoice)

4. **MERCHANT NAME (SELLER - IMPORTANT)**:
   - ALWAYS prefer the BRAND/TRADING name over legal entity
   - "Aegean Airlines" NOT "ΑΕΡΟΠΟΡΙΑ ΑΙΓΑΙΟΥ Α.Ε."
   - "Cosmote" NOT "COSMOTE - ΚΙΝΗΤΕΣ ΤΗΛΕΠΙΚΟΙΝΩΝΙΕΣ Α.Ε."

5. **VAT/TAX ID (ΑΦΜ) - CRITICALLY IMPORTANT**:
   - Greek VAT numbers are EXACTLY 9 digits (e.g. 123456789)
   - Look for: ΑΦΜ, Α.Φ.Μ., Tax ID, VAT Number, TIN
   - Strip any prefix like "EL", "GR", spaces, dots, dashes
   - Return ONLY the raw 9 digit number
   - NEVER confuse seller and buyer VAT numbers
   - seller=tax_id, buyer=buyer_vat

6. **AMOUNTS (CRITICAL)**:
   - amount = FINAL TOTAL INCLUDING VAT (Σύνολο Πληρωμής, Grand Total)
   - net_amount = Total BEFORE VAT (Καθαρή Αξία)
   - vat_amount = VAT amount (ΦΠΑ)
   - vat_rate = VAT percentage (usually 24%, 13%, or 6% in Greece)

7. **CATEGORIES** (choose the BEST match for a travel agency):
   airline, hotel, tolls, fuel, transport, payroll, government, rent, telecom, insurance, office, maintenance, marketing, other

8. **DOCUMENT TYPE**: invoice, receipt, credit_note, proforma

9. **OCR QUALITY ASSESSMENT** (IMPORTANT):
   - Assess the overall readability: clear / readable / partial / poor
   - List specific issues found: blurry_text, skewed, low_contrast, faded_ink, partial_crop, handwritten, stamp_overlay, small_font
   - If text is hard to read, still attempt extraction but report quality honestly

REMEMBER: Extract EXACTLY what you see. Convert numbers correctly. Be precise.`;

// Enhanced prompt for retry on low-quality documents
const enhancedOCRPrompt = `${baseSystemPrompt}

ENHANCED OCR MODE - This document had quality issues on first pass. Apply these extra techniques:

1. **AGGRESSIVE TEXT RECOVERY**: Look harder at faded, blurry, or partially visible text. Try to infer characters from context.
2. **LOGO & BRANDING**: If text is unreadable, identify the merchant from logos, brand colors, or partial text.
3. **NUMBER RECOVERY**: For amounts, look at digit shapes carefully. A blurry "8" vs "6" matters. Cross-check: net + vat should ≈ total.
4. **STRUCTURAL INFERENCE**: Use document layout (header=merchant, footer=totals, columns=line items) to locate data even when text is unclear.
5. **GREEK CHARACTER RECOVERY**: Common OCR mistakes: Α↔A, Ε↔E, Ο↔O, Η↔H, Ρ↔P. Consider both Greek and Latin readings.
6. **STAMP/HANDWRITING**: Ignore stamps/handwriting for amounts—use printed values. But check stamps for dates or approval marks.
7. **CROSS-VALIDATION**: If you find net_amount and vat_rate but amount is unclear, calculate amount = net_amount * (1 + vat_rate/100).`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
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
      return new Response(
        JSON.stringify({ error: 'Invalid session', code: 'INVALID_SESSION', extracted: null }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { filePath, fileName, fallbackMode } = await req.json();
    const startTime = Date.now();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!LOVABLE_API_KEY) {
      return new Response(
        JSON.stringify({ error: 'AI service not configured', code: 'CONFIG_ERROR', extracted: null }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!filePath || typeof filePath !== 'string') {
      return new Response(
        JSON.stringify({ error: 'Invalid file reference', code: 'INVALID_FILE', extracted: null }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!filePath.match(/^uploads\/[0-9]+-[a-zA-Z0-9]+\.(pdf|png|jpg|jpeg|webp)$/i)) {
      return new Response(
        JSON.stringify({ error: 'Invalid file path format', code: 'INVALID_PATH', extracted: null }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const safeFileName = String(fileName || 'document').substring(0, 100);
    const fileExtension = filePath.split('.').pop()?.toLowerCase() || '';
    const isPDF = fileExtension === 'pdf';
    const useFallback = fallbackMode === true;

    console.log(`[START] Processing invoice: ${safeFileName} (type: ${fileExtension}, fallback: ${useFallback})`);

    // Create service role client
    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

    // Build content payload
    const contentPayload = await buildContentPayload(supabase, filePath, safeFileName, isPDF);
    if ('error' in contentPayload) {
      return new Response(
        JSON.stringify({ error: contentPayload.error, code: contentPayload.code, extracted: null }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // First pass: use fast model
    const firstModel = useFallback ? "google/gemini-2.5-pro" : "google/gemini-3-flash-preview";
    console.log(`[AI] Pass 1 with ${firstModel}...`);

    const firstResult = await callAI(LOVABLE_API_KEY, firstModel, baseSystemPrompt, contentPayload.content, safeFileName, isPDF);

    if ('httpError' in firstResult) {
      return handleAIError(firstResult.httpError);
    }

    if (firstResult.parsed) {
      const confidence = calculateConfidence(firstResult.parsed);
      const ocrQuality = firstResult.parsed.ocr_quality || 'clear';
      const ocrIssues = firstResult.parsed.ocr_issues || [];
      
      console.log(`[PASS1] confidence=${confidence}, ocr_quality=${ocrQuality}, issues=${ocrIssues.join(',')}`);

      // If low confidence or poor quality → retry with Pro model + enhanced OCR prompt
      const needsRetry = !useFallback && (confidence < 0.55 || ocrQuality === 'poor' || ocrQuality === 'partial');

      if (needsRetry) {
        console.log(`[RETRY] Low quality detected, retrying with gemini-2.5-pro + enhanced OCR prompt...`);
        const retryModel = "google/gemini-2.5-pro";
        const retryResult = await callAI(LOVABLE_API_KEY, retryModel, enhancedOCRPrompt, contentPayload.content, safeFileName, isPDF);

        if (!('httpError' in retryResult) && retryResult.parsed) {
          const retryConfidence = calculateConfidence(retryResult.parsed);
          console.log(`[RETRY] retry confidence=${retryConfidence} vs original=${confidence}`);

          // Use retry result if it's better
          if (retryConfidence > confidence) {
            const duration_ms = Date.now() - startTime;
            return buildSuccessResponse(retryResult.parsed, retryConfidence, retryModel, duration_ms, true, retryResult.rawArgs);
          }
        }
      }

      // Return first pass result
      const duration_ms = Date.now() - startTime;
      return buildSuccessResponse(firstResult.parsed, confidence, firstModel, duration_ms, useFallback, firstResult.rawArgs);
    }

    // No structured data
    const duration_ms = Date.now() - startTime;
    return new Response(
      JSON.stringify({
        extracted: { merchant: null, amount: null, date: null, category: "other", confidence: 0.1 },
        _diagnostics: { model: firstModel, duration_ms, confidence: 0.1, is_fallback: useFallback }
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("[ERROR] Extraction error:", error);
    return new Response(
      JSON.stringify({ error: "Unable to process document. Please try again.", code: 'EXTRACTION_ERROR', extracted: null }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

// --- Helper functions ---

async function buildContentPayload(
  supabase: any, filePath: string, safeFileName: string, isPDF: boolean
): Promise<{ content: any[] } | { error: string; code: string }> {
  if (isPDF) {
    console.log("[PDF] Downloading PDF bytes for base64 encoding...");
    const { data: fileData, error: downloadError } = await supabase.storage.from("invoices").download(filePath);
    if (downloadError || !fileData) {
      console.error("[PDF] Failed to download PDF:", downloadError?.message);
      return { error: 'Unable to access PDF file', code: 'FILE_ACCESS_ERROR' };
    }

    const arrayBuffer = await fileData.arrayBuffer();
    const base64Data = base64Encode(arrayBuffer);
    console.log(`[PDF] Encoded PDF to base64 (${arrayBuffer.byteLength} bytes)`);

    const content: any[] = [
      {
        type: "text",
        text: `Extract ALL invoice data from this PDF document named "${safeFileName}". Read EVERY page carefully. Also assess the OCR/image quality of this document.`
      },
      { type: "image_url", image_url: { url: `data:application/pdf;base64,${base64Data}` } }
    ];

    const { data: pdfSignedUrlData } = await supabase.storage.from("invoices").createSignedUrl(filePath, 300);
    if (pdfSignedUrlData?.signedUrl) {
      content.push({ type: "image_url", image_url: { url: pdfSignedUrlData.signedUrl } });
    }

    return { content };
  } else {
    console.log("[IMAGE] Generating signed URL for image...");
    const { data: signedUrlData, error: signedUrlError } = await supabase.storage.from("invoices").createSignedUrl(filePath, 300);
    if (signedUrlError || !signedUrlData?.signedUrl) {
      return { error: 'Unable to access file', code: 'FILE_ACCESS_ERROR' };
    }

    return {
      content: [
        {
          type: "text",
          text: `Extract ALL invoice data from this image of an invoice/receipt named "${safeFileName}". Read every visible field carefully. Also assess the OCR/image quality — is it clear, readable, partial, or poor?`
        },
        { type: "image_url", image_url: { url: signedUrlData.signedUrl } }
      ]
    };
  }
}

async function callAI(
  apiKey: string, model: string, systemPrompt: string, contentPayload: any[], safeFileName: string, isPDF: boolean
): Promise<{ parsed: any; rawArgs: string } | { httpError: number }> {
  const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: contentPayload }
      ],
      tools: [extractionTool],
      tool_choice: { type: "function", function: { name: "extract_invoice_data" } }
    }),
  });

  if (!response.ok) {
    console.error(`[AI] Gateway error: ${response.status}`);
    return { httpError: response.status };
  }

  const aiResponse = await response.json();
  const toolCall = aiResponse.choices?.[0]?.message?.tool_calls?.[0];

  if (toolCall?.function?.arguments) {
    try {
      const parsed = JSON.parse(toolCall.function.arguments);
      return { parsed, rawArgs: toolCall.function.arguments };
    } catch (e) {
      console.error("[AI] Failed to parse tool call arguments:", e);
    }
  }

  // Fallback: try content parsing
  const content = aiResponse.choices?.[0]?.message?.content;
  if (content) {
    const cleanContent = content.replace(/```json\n?|\n?```/g, "").trim();
    const jsonMatch = cleanContent.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        const parsed = JSON.parse(jsonMatch[0]);
        return { parsed, rawArgs: jsonMatch[0] };
      } catch { /* ignore */ }
    }
  }

  return { parsed: null, rawArgs: '' };
}

function handleAIError(status: number): Response {
  if (status === 429) {
    return new Response(
      JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment.", code: 'RATE_LIMIT', extracted: null }),
      { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
  if (status === 402) {
    return new Response(
      JSON.stringify({ error: "AI credits exhausted. Please add credits to continue.", code: 'CREDITS_EXHAUSTED', extracted: null }),
      { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
  return new Response(
    JSON.stringify({ extracted: { merchant: null, amount: null, date: null, category: "other", confidence: 0.1 } }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}

function buildSuccessResponse(
  parsed: any, confidence: number, model: string, duration_ms: number, isFallback: boolean, rawArgs: string
): Response {
  const cleanTaxId = sanitizeVat(parsed.tax_id);
  const cleanBuyerVat = sanitizeVat(parsed.buyer_vat);

  console.log(`[RESULT] merchant=${parsed.merchant}, amount=${parsed.amount}, confidence=${confidence}, ocr_quality=${parsed.ocr_quality}, model=${model}`);

  return new Response(
    JSON.stringify({
      extracted: {
        merchant: parsed.merchant || null,
        tax_id: cleanTaxId,
        buyer_name: parsed.buyer_name || null,
        buyer_vat: cleanBuyerVat,
        amount: typeof parsed.amount === 'number' ? parsed.amount : null,
        net_amount: typeof parsed.net_amount === 'number' ? parsed.net_amount : null,
        date: parsed.date || null,
        category: parsed.category || "other",
        currency: parsed.currency || "EUR",
        vat_amount: typeof parsed.vat_amount === 'number' ? parsed.vat_amount : null,
        vat_rate: typeof parsed.vat_rate === 'number' ? parsed.vat_rate : null,
        invoice_number: parsed.invoice_number || null,
        document_type: parsed.document_type || "invoice",
        confidence,
        ocr_quality: parsed.ocr_quality || 'clear',
        ocr_issues: parsed.ocr_issues || [],
      },
      _diagnostics: {
        model,
        duration_ms,
        confidence,
        ocr_quality: parsed.ocr_quality || 'clear',
        ocr_issues: parsed.ocr_issues || [],
        raw_args: rawArgs,
        is_fallback: isFallback
      }
    }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}
