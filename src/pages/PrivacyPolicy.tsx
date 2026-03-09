import { Link, useSearchParams } from "react-router-dom";
import { useSEOHead } from "@/hooks/useSEOHead";
import { Receipt, ArrowLeft } from "lucide-react";

export default function PrivacyPolicy() {
  const [params] = useSearchParams();
  const lang = params.get("lang") === "en" ? "en" : "el";

  useSEOHead({
    title: lang === "el" ? "Πολιτική Απορρήτου — invalfa" : "Privacy Policy — invalfa",
    description: lang === "el"
      ? "Πολιτική απορρήτου και προστασίας δεδομένων της invalfa."
      : "invalfa privacy policy and data protection information.",
    canonicalUrl: `/privacy?lang=${lang}`,
    lang,
    alternateLang: { href: `/privacy?lang=${lang === "el" ? "en" : "el"}`, hreflang: lang === "el" ? "en" : "el" },
  });

  const backLink = lang === "el" ? "/landing" : "/landing/en";

  return (
    <div className="min-h-screen bg-[#07091a] text-slate-300">
      {/* Header */}
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
          {lang === "el" ? "Πολιτική Απορρήτου" : "Privacy Policy"}
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
      <h2>1. Introduction</h2>
      <p>invalfa ("we", "us", "our") is committed to protecting your privacy. This policy explains how we collect, use, and safeguard your information when you use our invoice management platform for travel agencies.</p>

      <h2>2. Data We Collect</h2>
      <ul className="list-disc pl-6">
        <li><strong>Account data:</strong> Email address, name, company information provided during registration.</li>
        <li><strong>Financial documents:</strong> Invoices, receipts, and bank statements you upload for processing.</li>
        <li><strong>Usage data:</strong> Pages visited, features used, timestamps — collected via standard analytics.</li>
        <li><strong>Technical data:</strong> IP address, browser type, device information.</li>
      </ul>

      <h2>3. How We Use Your Data</h2>
      <p>We use your data to provide the invoice management service, including document storage, AI-powered data extraction, bank reconciliation, and financial reporting. We do not sell your data to third parties.</p>

      <h2>4. Data Storage & Security</h2>
      <p>All data is stored securely on EU-based servers with encryption at rest and in transit. Financial documents are stored in isolated, encrypted storage buckets. We follow industry-standard security practices including regular backups and access controls.</p>

      <h2>5. Third-Party Services</h2>
      <p>We use the following third-party services:</p>
      <ul className="list-disc pl-6">
        <li>Cloud infrastructure for data storage and processing</li>
        <li>AI services for document data extraction</li>
        <li>Payment processor for subscription billing</li>
      </ul>

      <h2>6. Your Rights (GDPR)</h2>
      <p>Under the General Data Protection Regulation (GDPR), you have the right to:</p>
      <ul className="list-disc pl-6">
        <li>Access your personal data</li>
        <li>Rectify inaccurate data</li>
        <li>Request deletion of your data</li>
        <li>Export your data in a portable format</li>
        <li>Object to or restrict processing</li>
        <li>Withdraw consent at any time</li>
      </ul>

      <h2>7. Data Retention</h2>
      <p>We retain your data for as long as your account is active. Upon account deletion, all personal data and uploaded documents are permanently removed within 30 days. Financial records may be retained longer as required by applicable tax law.</p>

      <h2>8. Cookies</h2>
      <p>We use essential cookies for authentication and session management. Optional analytics cookies are only set with your consent. See our cookie banner for controls.</p>

      <h2>9. Contact</h2>
      <p>For privacy-related questions or to exercise your rights, contact us at <a href="mailto:privacy@invalfa.com" className="text-blue-400 hover:text-blue-300">privacy@invalfa.com</a>.</p>
    </div>
  );
}

function GreekContent() {
  return (
    <div className="prose prose-invert prose-slate max-w-none space-y-8 [&_h2]:text-white [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:mt-10 [&_h2]:mb-4 [&_p]:leading-relaxed [&_ul]:space-y-2">
      <h2>1. Εισαγωγή</h2>
      <p>Η invalfa ("εμείς") δεσμεύεται να προστατεύει τα προσωπικά σας δεδομένα. Αυτή η πολιτική εξηγεί πώς συλλέγουμε, χρησιμοποιούμε και προστατεύουμε τις πληροφορίες σας όταν χρησιμοποιείτε την πλατφόρμα διαχείρισης παραστατικών μας.</p>

      <h2>2. Δεδομένα που Συλλέγουμε</h2>
      <ul className="list-disc pl-6">
        <li><strong>Στοιχεία λογαριασμού:</strong> Email, όνομα, στοιχεία εταιρείας κατά την εγγραφή.</li>
        <li><strong>Οικονομικά έγγραφα:</strong> Τιμολόγια, αποδείξεις και extrait τράπεζας που ανεβάζετε.</li>
        <li><strong>Δεδομένα χρήσης:</strong> Σελίδες που επισκέπτεστε, λειτουργίες που χρησιμοποιείτε.</li>
        <li><strong>Τεχνικά δεδομένα:</strong> Διεύθυνση IP, πρόγραμμα περιήγησης, τύπος συσκευής.</li>
      </ul>

      <h2>3. Πώς Χρησιμοποιούμε τα Δεδομένα</h2>
      <p>Χρησιμοποιούμε τα δεδομένα σας για την παροχή της υπηρεσίας διαχείρισης παραστατικών, συμπεριλαμβανομένης της αποθήκευσης εγγράφων, εξαγωγής δεδομένων με AI, συμφωνίας τραπεζικών κινήσεων και οικονομικών αναφορών. Δεν πουλάμε τα δεδομένα σας σε τρίτους.</p>

      <h2>4. Αποθήκευση & Ασφάλεια</h2>
      <p>Όλα τα δεδομένα αποθηκεύονται σε ασφαλείς servers εντός ΕΕ με κρυπτογράφηση. Τα οικονομικά έγγραφα αποθηκεύονται σε απομονωμένους, κρυπτογραφημένους χώρους αποθήκευσης.</p>

      <h2>5. Υπηρεσίες Τρίτων</h2>
      <ul className="list-disc pl-6">
        <li>Υποδομή cloud για αποθήκευση και επεξεργασία δεδομένων</li>
        <li>Υπηρεσίες AI για εξαγωγή δεδομένων εγγράφων</li>
        <li>Πάροχος πληρωμών για χρέωση συνδρομών</li>
      </ul>

      <h2>6. Τα Δικαιώματά σας (GDPR)</h2>
      <p>Σύμφωνα με τον Γενικό Κανονισμό Προστασίας Δεδομένων (GDPR), έχετε δικαίωμα:</p>
      <ul className="list-disc pl-6">
        <li>Πρόσβασης στα προσωπικά σας δεδομένα</li>
        <li>Διόρθωσης ανακριβών δεδομένων</li>
        <li>Διαγραφής των δεδομένων σας</li>
        <li>Εξαγωγής σε φορητή μορφή</li>
        <li>Εναντίωσης ή περιορισμού της επεξεργασίας</li>
        <li>Ανάκλησης της συγκατάθεσής σας ανά πάσα στιγμή</li>
      </ul>

      <h2>7. Διατήρηση Δεδομένων</h2>
      <p>Διατηρούμε τα δεδομένα σας όσο ο λογαριασμός σας είναι ενεργός. Μετά τη διαγραφή, όλα τα προσωπικά δεδομένα αφαιρούνται μόνιμα εντός 30 ημερών.</p>

      <h2>8. Cookies</h2>
      <p>Χρησιμοποιούμε απαραίτητα cookies για ταυτοποίηση. Τα προαιρετικά cookies ενεργοποιούνται μόνο με τη συγκατάθεσή σας.</p>

      <h2>9. Επικοινωνία</h2>
      <p>Για ερωτήσεις σχετικά με το απόρρητο: <a href="mailto:privacy@invalfa.com" className="text-blue-400 hover:text-blue-300">privacy@invalfa.com</a></p>
    </div>
  );
}
