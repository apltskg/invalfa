import { supabase } from "@/integrations/supabase/client";

/**
 * Tries to find a matching customer or supplier by merchant name and/or VAT number.
 * Returns { customer_id, supplier_id } to be spread into the invoice insert object.
 */
export async function resolveContactIds(
  merchantName: string | null | undefined,
  invoiceType: "income" | "expense",
  extractedVat?: string | null
): Promise<{ customer_id?: string | null; supplier_id?: string | null }> {
  if (!merchantName && !extractedVat) return {};

  const table = invoiceType === "income" ? "customers" : "suppliers";
  const idKey = invoiceType === "income" ? "customer_id" : "supplier_id";

  try {
    const { data: contacts } = await supabase
      .from(table)
      .select("id,name,vat_number");

    if (!contacts || contacts.length === 0) return {};

    const cleanMerchant = (merchantName || "").trim().toLowerCase();
    const cleanVat = (extractedVat || "").replace(/\D/g, "");

    // 1. Exact VAT match (strongest signal)
    if (cleanVat && cleanVat.length >= 9) {
      const vatMatch = contacts.find(c => {
        const cVat = (c.vat_number || "").replace(/\D/g, "");
        return cVat === cleanVat && cVat.length >= 9;
      });
      if (vatMatch) return { [idKey]: vatMatch.id };
    }

    // 2. Exact name match (case-insensitive)
    if (cleanMerchant) {
      const exactMatch = contacts.find(c =>
        c.name.trim().toLowerCase() === cleanMerchant
      );
      if (exactMatch) return { [idKey]: exactMatch.id };

      // 3. Contains match (one includes the other)
      if (cleanMerchant.length > 3) {
        const containsMatch = contacts.find(c => {
          const cName = c.name.trim().toLowerCase();
          if (cName.length <= 3) return false;
          return cleanMerchant.includes(cName) || cName.includes(cleanMerchant);
        });
        if (containsMatch) return { [idKey]: containsMatch.id };
      }
    }

    return {};
  } catch (err) {
    console.warn("Auto-link contact failed:", err);
    return {};
  }
}
