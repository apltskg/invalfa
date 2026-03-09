import { Link, useSearchParams } from "react-router-dom";
import { useSEOHead } from "@/hooks/useSEOHead";
import { Receipt, ArrowLeft } from "lucide-react";

export default function TermsOfService() {
  const [params] = useSearchParams();
  const lang = params.get("lang") === "en" ? "en" : "el";

  useSEOHead({
    title: lang === "el" ? "Όροι Χρήσης — invalfa" : "Terms of Service — invalfa",
    description: lang === "el"
      ? "Όροι και προϋποθέσεις χρήσης της πλατφόρμας invalfa."
      : "Terms and conditions for using the invalfa platform.",
    canonicalUrl: `/terms?lang=${lang}`,
    lang,
    alternateLang: { href: `/terms?lang=${lang === "el" ? "en" : "el"}`, hreflang: lang === "el" ? "en" : "el" },
  });

  const backLink = lang === "el" ? "/landing" : "/landing/en";

  return (
    <div className="min-h-screen bg-[#07091a] text-slate-300">
      <header className="border-b border-white/5 px-6 py-4">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <Link to={backLink} className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-xl bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center">
              <Receipt className="h-4 w-4 text-white" />
            </div>
            <span className="font-black text-white text-xl">invalfa</span>
          </Link>
          <Link to={backLink} className="text-sm text-slate-500 hover:text-white transition-colors flex items-center gap-1">
            <ArrowLeft className="h-4 w-4" />
            {lang === "el" ? "Αρχική" : "Home"}
          </Link>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-16">
        <h1 className="text-3xl font-bold text-white mb-2">
          {lang === "el" ? "Όροι Χρήσης" : "Terms of Service"}
        </h1>
        <p className="text-sm text-slate-500 mb-10">
          {lang === "el" ? "Τελευταία ενημέρωση: Μάρτιος 2026" : "Last updated: March 2026"}
        </p>

        {lang === "el" ? <GreekContent /> : <EnglishContent />}
      </main>
    </div>
  );
}

function EnglishContent() {
  return (
    <div className="prose prose-invert prose-slate max-w-none space-y-8 [&_h2]:text-white [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:mt-10 [&_h2]:mb-4 [&_p]:leading-relaxed [&_ul]:space-y-2">
      <h2>1. Acceptance of Terms</h2>
      <p>By accessing or using invalfa ("the Service"), you agree to be bound by these Terms of Service. If you do not agree, do not use the Service.</p>

      <h2>2. Description of Service</h2>
      <p>invalfa is a cloud-based invoice and expense management platform designed for travel agencies. The Service includes document upload and storage, AI-powered data extraction, bank reconciliation, financial reporting, and export capabilities.</p>

      <h2>3. Account Registration</h2>
      <p>You must provide accurate and complete information when creating an account. You are responsible for maintaining the security of your account credentials and for all activities under your account.</p>

      <h2>4. Subscription & Billing</h2>
      <ul className="list-disc pl-6">
        <li>Subscriptions are billed monthly or annually as selected at checkout.</li>
        <li>Prices are in EUR and exclusive of applicable taxes unless stated otherwise.</li>
        <li>You may cancel at any time; access continues until the end of the billing period.</li>
        <li>Refunds are provided on a case-by-case basis within 14 days of initial purchase.</li>
      </ul>

      <h2>5. Acceptable Use</h2>
      <p>You agree not to misuse the Service. Prohibited activities include uploading malicious content, attempting unauthorized access, and using the Service for illegal purposes.</p>

      <h2>6. Data Ownership</h2>
      <p>You retain full ownership of all data you upload. We do not claim any intellectual property rights over your documents. We only access your data to provide and improve the Service.</p>

      <h2>7. Service Availability</h2>
      <p>We aim for 99.9% uptime but do not guarantee uninterrupted access. Planned maintenance will be communicated in advance. We are not liable for losses caused by service interruptions.</p>

      <h2>8. Limitation of Liability</h2>
      <p>To the maximum extent permitted by law, invalfa shall not be liable for any indirect, incidental, or consequential damages arising from the use of the Service. Our total liability shall not exceed the amount paid by you in the 12 months preceding the claim.</p>

      <h2>9. Termination</h2>
      <p>Either party may terminate the agreement at any time. Upon termination, you may export your data within 30 days, after which it will be permanently deleted.</p>

      <h2>10. Governing Law</h2>
      <p>These terms are governed by the laws of the Hellenic Republic. Any disputes shall be resolved in the courts of Athens, Greece.</p>

      <h2>11. Contact</h2>
      <p>For questions about these terms: <a href="mailto:legal@invalfa.com" className="text-blue-400 hover:text-blue-300">legal@invalfa.com</a></p>
    </div>
  );
}

function GreekContent() {
  return (
    <div className="prose prose-invert prose-slate max-w-none space-y-8 [&_h2]:text-white [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:mt-10 [&_h2]:mb-4 [&_p]:leading-relaxed [&_ul]:space-y-2">
      <h2>1. Αποδοχή Όρων</h2>
      <p>Με την πρόσβαση ή χρήση της invalfa ("η Υπηρεσία"), αποδέχεστε τους παρόντες Όρους Χρήσης. Εάν δεν συμφωνείτε, μην χρησιμοποιείτε την Υπηρεσία.</p>

      <h2>2. Περιγραφή Υπηρεσίας</h2>
      <p>Η invalfa είναι μια cloud πλατφόρμα διαχείρισης παραστατικών και εξόδων σχεδιασμένη για τουριστικά γραφεία. Περιλαμβάνει αποθήκευση εγγράφων, εξαγωγή δεδομένων με AI, συμφωνία τραπεζικών κινήσεων και οικονομικές αναφορές.</p>

      <h2>3. Εγγραφή Λογαριασμού</h2>
      <p>Πρέπει να παρέχετε ακριβή στοιχεία κατά τη δημιουργία λογαριασμού. Είστε υπεύθυνοι για την ασφάλεια των διαπιστευτηρίων σας.</p>

      <h2>4. Συνδρομή & Χρεώσεις</h2>
      <ul className="list-disc pl-6">
        <li>Οι συνδρομές χρεώνονται μηνιαία ή ετήσια.</li>
        <li>Οι τιμές είναι σε EUR και δεν περιλαμβάνουν φόρους εκτός αν αναφέρεται.</li>
        <li>Μπορείτε να ακυρώσετε ανά πάσα στιγμή.</li>
        <li>Επιστροφές χρημάτων εξετάζονται εντός 14 ημερών από την αρχική αγορά.</li>
      </ul>

      <h2>5. Αποδεκτή Χρήση</h2>
      <p>Δεν επιτρέπεται η κακόβουλη χρήση, ανέβασμα κακόβουλου περιεχομένου ή παράνομη χρήση της Υπηρεσίας.</p>

      <h2>6. Ιδιοκτησία Δεδομένων</h2>
      <p>Διατηρείτε πλήρη ιδιοκτησία όλων των δεδομένων που ανεβάζετε. Δεν διεκδικούμε δικαιώματα πνευματικής ιδιοκτησίας στα έγγραφά σας.</p>

      <h2>7. Διαθεσιμότητα Υπηρεσίας</h2>
      <p>Στοχεύουμε σε 99.9% διαθεσιμότητα αλλά δεν εγγυόμαστε αδιάλειπτη πρόσβαση. Δεν φέρουμε ευθύνη για ζημίες από διακοπές υπηρεσίας.</p>

      <h2>8. Περιορισμός Ευθύνης</h2>
      <p>Η συνολική ευθύνη μας δεν θα υπερβαίνει το ποσό που καταβάλατε τους τελευταίους 12 μήνες.</p>

      <h2>9. Καταγγελία</h2>
      <p>Μπορείτε να εξάγετε τα δεδομένα σας εντός 30 ημερών από τη λήξη, μετά διαγράφονται οριστικά.</p>

      <h2>10. Εφαρμοστέο Δίκαιο</h2>
      <p>Οι παρόντες όροι διέπονται από το ελληνικό δίκαιο. Αρμόδια δικαστήρια είναι τα δικαστήρια Αθηνών.</p>

      <h2>11. Επικοινωνία</h2>
      <p>Για ερωτήσεις: <a href="mailto:legal@invalfa.com" className="text-blue-400 hover:text-blue-300">legal@invalfa.com</a></p>
    </div>
  );
}
