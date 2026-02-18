
import { TaxLiability } from "./tax-engine";

// Simulate AI processing delay
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Simulates a conversation with an AI Accountant specialized in Greek Tax Law.
 */
export async function askAccountant(prompt: string, liability: TaxLiability): Promise<string> {
  await delay(1500); // Simulate thinking

  const promptLower = prompt.toLowerCase();
  const { vatPayable, incomeTax, tradeTax, totalLiability, netProfit } = liability;

  // Context-aware responses
  if (promptLower.includes("φπα") || promptLower.includes("vat")) {
      if (vatPayable > 0) {
          return `Για το τρέχον διάστημα, το χρεωστικό υπόλοιπο ΦΠΑ ανέρχεται στα €${vatPayable.toLocaleString()}. Αυτό προκύπτει επειδή τα έσοδά σας (€${(vatPayable / 0.24).toLocaleString()} καθαρά περίπου) υπερβαίνουν τα έξοδά σας. Προτείνω την άμεση εξόφληση ή ρύθμιση για αποφυγή προσαυξήσεων.`;
      } else {
          return `Έχετε πιστωτικό υπόλοιπο ΦΠΑ €${Math.abs(vatPayable).toLocaleString()}. Αυτό σημαίνει ότι μπορείτε να το συμψηφίσετε με μελλοντικές υποχρεώσεις ΦΠΑ.`;
      }
  }

  if (promptLower.includes("φόρ") || promptLower.includes("tax")) {
      return `Η εκτιμώμενη φορολογική σας επιβάρυνση είναι €${totalLiability.toLocaleString()}. Αυτή περιλαμβάνει τον φόρο εισοδήματος (€${incomeTax.toLocaleString()}) και το τέλος επιτηδεύματος (€${tradeTax.toLocaleString()}). ${incomeTax > 5000 ? "Επειδή ο φόρος είναι υψηλός, ίσως αξίζει να εξετάσετε πρόσθετες επαγγελματικές δαπάνες πριν το τέλος του έτους." : "Η επιβάρυνση είναι σε λογικά επίπεδα για την κερδοφορία σας."}`;
  }

  if (promptLower.includes("κέρδ") || promptLower.includes("profit")) {
      return `Τα καθαρά κέρδη προ φόρων είναι €${netProfit.toLocaleString()}. Μετά την αφαίρεση των φόρων (€${totalLiability.toLocaleString()}), τα διαθέσιμα κέρδη είναι €${liability.netProfitAfterTax.toLocaleString()}. Η απόδοση της επιχείρησής σας είναι ${(liability.netProfitAfterTax / Math.max(1, netProfit + totalLiability) * 100).toFixed(1)}%.`;
  }

  if (promptLower.includes("βελτιστοποίη") || promptLower.includes("optimize")) {
      const suggestExpense = netProfit * 0.15;
      return `Για να μειώσετε τον φόρο εισοδήματος, θα πρότεινα την πραγματοποίηση παραγωγικών δαπανών ύψους περίπου €${suggestExpense.toLocaleString()}. Εξετάστε επενδύσεις σε πάγια, αναλώσιμα ή υπηρεσίες μάρκετινγκ που θα βοηθήσουν την ανάπτυξή σας.`;
  }

  // Default fallback
  return `Ως ο ψηφιακός λογιστής σας, βλέπω ότι η συνολική σας φορολογική υποχρέωση εκτιμάται στα €${totalLiability.toLocaleString()}. Μπορώ να απαντήσω σε ερωτήσεις για τον ΦΠΑ, τον Φόρο Εισοδήματος, ή να προτείνω τρόπους φορολογικής βελτιστοποίησης. Πώς μπορώ να βοηθήσω;`;
}
