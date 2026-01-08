import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const AIRLINE_KEYWORDS = ["aegean", "ryanair", "tap", "lufthansa", "british airways", "easyjet", "vueling", "airline", "flight", "boarding"];
const HOTEL_KEYWORDS = ["marriott", "hilton", "booking.com", "airbnb", "hotel", "hostel", "accommodation", "resort", "inn"];
const TOLL_KEYWORDS = ["via verde", "toll", "highway", "motorway", "autoestrada", "peaje"];

function detectCategory(text: string): "airline" | "hotel" | "tolls" | "other" {
  const lowerText = text.toLowerCase();
  
  if (AIRLINE_KEYWORDS.some(kw => lowerText.includes(kw))) return "airline";
  if (HOTEL_KEYWORDS.some(kw => lowerText.includes(kw))) return "hotel";
  if (TOLL_KEYWORDS.some(kw => lowerText.includes(kw))) return "tolls";
  
  return "other";
}

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

    console.log("Processing invoice:", fileName);

    // Prepare prompt for AI extraction
    const systemPrompt = `You are an invoice data extraction assistant. Extract the following information from the invoice image or PDF:
- merchant: The company/vendor name
- amount: The total amount (number only, no currency symbols)
- date: The invoice date in YYYY-MM-DD format
- category: One of "airline", "hotel", "tolls", or "other" based on the type of service

Look for keywords to determine category:
- Airline: airline names, flight, boarding pass
- Hotel: hotel names, booking.com, accommodation
- Tolls: via verde, toll, highway fees

Return ONLY a JSON object with these fields. If you can't determine a value, use null.`;

    const userPrompt = `Extract invoice data from this document. The file is named: ${fileName}`;

    // Call Lovable AI Gateway
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
              { type: "text", text: userPrompt },
              { type: "image_url", image_url: { url: fileUrl } }
            ]
          }
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI Gateway error:", response.status, errorText);
      
      // Return fallback extraction based on filename
      const category = detectCategory(fileName);
      return new Response(
        JSON.stringify({
          extracted: {
            merchant: null,
            amount: null,
            date: null,
            category,
            confidence: 0.3
          }
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const aiResponse = await response.json();
    const content = aiResponse.choices?.[0]?.message?.content;

    console.log("AI response:", content);

    // Parse the AI response
    let extracted = {
      merchant: null as string | null,
      amount: null as number | null,
      date: null as string | null,
      category: "other" as "airline" | "hotel" | "tolls" | "other",
      confidence: 0.8
    };

    try {
      // Try to extract JSON from the response
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        extracted = {
          merchant: parsed.merchant || null,
          amount: parsed.amount ? parseFloat(parsed.amount) : null,
          date: parsed.date || null,
          category: parsed.category || detectCategory(content),
          confidence: 0.85
        };
      }
    } catch (parseError) {
      console.error("Failed to parse AI response:", parseError);
      extracted.category = detectCategory(content || fileName);
      extracted.confidence = 0.5;
    }

    return new Response(
      JSON.stringify({ extracted }),
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
