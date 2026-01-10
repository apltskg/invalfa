import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { fileUrl, fileName } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    console.log("Processing invoice:", fileName, "URL:", fileUrl);

    // Use tool calling for structured extraction
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { 
            role: "system", 
            content: `You are an expert invoice data extraction assistant. Analyze invoice images/PDFs and extract structured data accurately.

For category classification:
- "airline": Airlines (Aegean, Ryanair, TAP, Lufthansa, BA, easyJet, Vueling), flights, boarding passes
- "hotel": Hotels (Marriott, Hilton), Booking.com, Airbnb, hostels, accommodation
- "tolls": Via Verde, toll roads, highway fees, motorway charges
- "other": Restaurants, taxis, fuel, general expenses

Extract the TOTAL amount paid, not subtotals. For dates, use the invoice/transaction date.`
          },
          { 
            role: "user", 
            content: [
              { 
                type: "text", 
                text: `Extract invoice data from this document. Filename: ${fileName}. Look carefully at all text, numbers, and dates visible in the document.`
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
                    description: "Company or vendor name (e.g., 'Aegean Airlines', 'Marriott Hotel')" 
                  },
                  amount: { 
                    type: "number", 
                    description: "Total amount paid as a number (e.g., 125.50)" 
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
    console.log("AI response:", JSON.stringify(aiResponse, null, 2));

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
      console.log("Fallback content parsing:", content);
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
