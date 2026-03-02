import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/**
 * ΑΑΔΕ ΑΦΜ Verification Edge Function
 * 
 * Calls the Greek GSIS (Γενική Γραμματεία Πληροφοριακών Συστημάτων) SOAP API
 * to verify a VAT number and return company details.
 * 
 * Public WSDL: https://www1.gsis.gr/wsaade/RgWsPublic2/RgWsPublic2?WSDL
 */
serve(async (req: any) => {
    if (req.method === "OPTIONS") {
        return new Response(null, { headers: corsHeaders });
    }

    try {
        const { afm, callerAfm } = await req.json();

        if (!afm || typeof afm !== "string" || afm.length !== 9 || !/^\d{9}$/.test(afm)) {
            return new Response(
                JSON.stringify({ error: "Μη έγκυρο ΑΦΜ. Πρέπει να είναι 9 ψηφία." }),
                { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        // GSIS credentials - these are provided by ΑΑΔΕ for registered applications
        const gsisUsername = Deno.env.get("GSIS_USERNAME") || "";
        const gsisPassword = Deno.env.get("GSIS_PASSWORD") || "";
        // The caller's own AFM (your company AFM) - required by GSIS
        const myAfm = callerAfm || Deno.env.get("COMPANY_AFM") || "";

        if (!gsisUsername || !gsisPassword) {
            // Fallback: try a simpler lookup via a public endpoint
            console.log("[AFM] GSIS credentials not configured, using fallback...");

            return new Response(
                JSON.stringify({
                    found: false,
                    error: "Η υπηρεσία ΑΑΔΕ δεν είναι ρυθμισμένη. Προσθέστε GSIS_USERNAME και GSIS_PASSWORD.",
                    afm,
                }),
                { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        // Build SOAP request
        const soapEnvelope = `<?xml version="1.0" encoding="UTF-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" 
                  xmlns:rgws="http://rgwspublic2/RgWsPublic2Service">
  <soapenv:Header/>
  <soapenv:Body>
    <rgws:rgWsPublic2AfmMethod>
      <INPUT_REC>
        <afm_called_by>${myAfm}</afm_called_by>
        <afm_called_for>${afm}</afm_called_for>
      </INPUT_REC>
    </rgws:rgWsPublic2AfmMethod>
  </soapenv:Body>
</soapenv:Envelope>`;

        console.log(`[AFM] Querying GSIS for AFM: ${afm.substring(0, 3)}***`);

        const response = await fetch(
            "https://www1.gsis.gr/wsaade/RgWsPublic2/RgWsPublic2",
            {
                method: "POST",
                headers: {
                    "Content-Type": "text/xml; charset=utf-8",
                    "SOAPAction": "",
                    "Authorization": "Basic " + btoa(`${gsisUsername}:${gsisPassword}`),
                },
                body: soapEnvelope,
            }
        );

        if (!response.ok) {
            console.error(`[AFM] GSIS returned ${response.status}`);
            return new Response(
                JSON.stringify({ error: `Σφάλμα ΑΑΔΕ: ${response.status}`, found: false }),
                { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        const xml = await response.text();
        console.log(`[AFM] Response received (${xml.length} chars)`);

        // Parse key fields from XML response
        const extractField = (fieldName: string): string => {
            const regex = new RegExp(`<${fieldName}>([^<]*)</${fieldName}>`, "i");
            const match = xml.match(regex);
            return match?.[1]?.trim() || "";
        };

        const errorCode = extractField("error_code") || extractField("ErrorCode");

        if (errorCode && errorCode !== "0") {
            const errorDesc = extractField("error_descr") || extractField("ErrorDescr");
            return new Response(
                JSON.stringify({
                    found: false,
                    error: errorDesc || `Κωδικός σφάλματος: ${errorCode}`,
                    afm,
                }),
                { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        // Extract company details
        const result = {
            found: true,
            afm,
            name: extractField("onomasia") || extractField("Onomasia"),
            legalName: extractField("onomasia") || "",
            tradeName: extractField("commer_title") || extractField("CommerTitle") || "",
            doy: extractField("doy_descr") || extractField("DoyDescr") || "",
            doyCode: extractField("doy") || extractField("Doy") || "",
            address: {
                street: extractField("postal_address") || extractField("PostalAddress") || "",
                number: extractField("postal_address_no") || extractField("PostalAddressNo") || "",
                zip: extractField("postal_zip_code") || extractField("PostalZipCode") || "",
                city: extractField("postal_area_description") || extractField("PostalAreaDescription") || "",
            },
            activity: extractField("firm_act_descr") || extractField("FirmActDescr") || "",
            registrationDate: extractField("regist_date") || extractField("RegistDate") || "",
            stopDate: extractField("stop_date") || extractField("StopDate") || "",
            isActive: !extractField("stop_date") && !extractField("StopDate"),
        };

        console.log(`[AFM] Found: ${result.name} (${result.doy})`);

        return new Response(
            JSON.stringify(result),
            { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );

    } catch (error: any) {
        console.error("[AFM] Error:", error.message);
        return new Response(
            JSON.stringify({ error: error.message || "Σφάλμα επικοινωνίας", found: false }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }
});
