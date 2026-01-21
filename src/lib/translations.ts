// Greek translations for the entire app
export const el = {
    // Navigation
    nav: {
        packages: "Φάκελοι",
        dashboard: "Πίνακας",
        suppliers: "Προμηθευτές",
        customers: "Πελάτες",
        bankSync: "Συγχρονισμός Τράπεζας",
        exportHub: "Εξαγωγές",
        analytics: "Αναλύσεις",
        proforma: "Νέο Προτιμολόγιο",
        manageProformas: "Διαχείριση Προτιμολογίων",
        settings: "Ρυθμίσεις",
    },

    // Common
    common: {
        save: "Αποθήκευση",
        cancel: "Ακύρωση",
        delete: "Διαγραφή",
        edit: "Επεξεργασία",
        add: "Προσθήκη",
        search: "Αναζήτηση",
        filter: "Φίλτρο",
        export: "Εξαγωγή",
        import: "Εισαγωγή",
        upload: "Ανέβασμα",
        download: "Λήψη",
        loading: "Φόρτωση...",
        noData: "Δεν υπάρχουν δεδομένα",
        confirm: "Επιβεβαίωση",
        actions: "Ενέργειες",
        date: "Ημερομηνία",
        amount: "Ποσό",
        status: "Κατάσταση",
        type: "Τύπος",
        notes: "Σημειώσεις",
    },

    // Dashboard
    dashboard: {
        title: "Οικονομικός Πίνακας",
        subtitle: "Επισκόπηση εσόδων και εξόδων",
        totalIncome: "Συνολικά Έσοδα",
        totalExpenses: "Συνολικά Έξοδα",
        netProfit: "Καθαρό Κέρδος",
        profitMargin: "Περιθώριο Κέρδους",
        quickAdd: "Γρήγορη Προσθήκη",
        addIncome: "Προσθήκη Εσόδου",
        addExpense: "Προσθήκη Εξόδου",
        recentTransactions: "Πρόσφατες Συναλλαγές",
        viewAll: "Προβολή Όλων",
    },

    // Income/Expense Types
    transactionTypes: {
        // Income
        busTransfers: "Μεταφορές Επιβατών",
        packageSales: "Πωλήσεις Πακέτων",
        otherIncome: "Άλλα Έσοδα",

        // Expenses
        payroll: "Μισθοδοσία",
        fuel: "Πετρέλαια",
        taxes: "Εφορία",
        tolls: "Διόδια",
        hotel: "Διαμονή",
        airline: "Αεροπορικά",
        other: "Άλλα",
    },

    // Packages
    packages: {
        title: "Ταξιδιωτικοί Φάκελοι",
        subtitle: "Διαχείριση πακέτων και κερδοφορίας",
        newPackage: "Νέος Φάκελος",
        clientName: "Όνομα Πελάτη / Ομάδας",
        startDate: "Ημερομηνία Έναρξης",
        endDate: "Ημερομηνία Λήξης",
        targetMargin: "Στόχος Περιθωρίου (%)",
        status: {
            quote: "Προσφορά",
            active: "Ενεργό",
            completed: "Ολοκληρωμένο",
            cancelled: "Ακυρωμένο",
        },
        stats: {
            total: "Σύνολο",
            matched: "Ταιριασμένα",
            expenses: "Έξοδα",
            income: "Έσοδα",
            profit: "Κέρδος",
            margin: "Περιθώριο",
        },
    },

    // Suppliers
    suppliers: {
        title: "Προμηθευτές",
        subtitle: "Διαχείριση πάροχων υπηρεσιών",
        addSupplier: "Προσθήκη Προμηθευτή",
        companyName: "Επωνυμία Εταιρείας",
        contactPerson: "Υπεύθυνος Επικοινωνίας",
        email: "Email",
        phone: "Τηλέφωνο",
        address: "Διεύθυνση",
        notes: "Σημειώσεις",
        instructions: "Οδηγίες Παραλαβής Τιμολογίου",
        noSuppliersFound: "Δεν βρέθηκαν προμηθευτές",
        createFirst: "Δημιουργήστε τον πρώτο προμηθευτή",
    },

    // Customers
    customers: {
        title: "Πελάτες",
        subtitle: "Διαχείριση πελατών και ταξιδιωτών",
        addCustomer: "Προσθήκη Πελάτη",
        name: "Όνομα / Επωνυμία",
        contactPerson: "Υπεύθυνος",
        email: "Email",
        phone: "Τηλέφωνο",
        address: "Διεύθυνση",
        notes: "Σημειώσεις",
        noCustomersFound: "Δεν βρέθηκαν πελάτες",
        createFirst: "Δημιουργήστε τον πρώτο πελάτη",
    },

    // Bank Sync
    bankSync: {
        title: "Συγχρονισμός Τράπεζας",
        subtitle: "Ανέβασμα και ταίριασμα τραπεζικών κινήσεων",
        uploadStatement: "Ανέβασμα Αντιγράφου",
        lastSync: "Τελευταίος Συγχρονισμός",
        transactions: "Συναλλαγές",
        matched: "Ταιριασμένες",
        unmatched: "Αταίριαστες",
        matchTransaction: "Ταίριασμα με Τιμολόγιο",
    },

    // Analytics
    analytics: {
        title: "Αναλύσεις",
        subtitle: "Οικονομική ανάλυση και γραφήματα",
        incomeVsExpenses: "Έσοδα vs Έξοδα",
        categoryBreakdown: "Ανάλυση ανά Κατηγορία",
        monthlyTrends: "Μηνιαίες Τάσεις",
        profitability: "Κερδοφορία",
        thisMonth: "Τρέχων Μήνας",
        lastMonth: "Προηγούμενος Μήνας",
        thisYear: "Φέτος",
        custom: "Προσαρμοσμένο",
    },

    // Settings
    settings: {
        title: "Ρυθμίσεις",
        subtitle: "Διαχείριση στοιχείων γραφείου",
        agencyDetails: "Στοιχεία Γραφείου",
        companyName: "Επωνυμία",
        vatNumber: "ΑΦΜ",
        address: "Διεύθυνση",
        phone: "Τηλέφωνο",
        email: "Email",
        bankDetails: "Τραπεζικά Στοιχεία",
        bankName: "Όνομα Τράπεζας",
        iban: "IBAN",
        swift: "SWIFT/BIC",
        branding: "Προβολή",
        logoUrl: "URL Λογότυπου",
        saveSettings: "Αποθήκευση Ρυθμίσεων",
    },

    // Notifications
    notifications: {
        title: "Ειδοποιήσεις",
        bankSyncReminder: "Υπενθύμιση: Ανεβάστε το αντίγραφο τράπεζας για τον μήνα",
        missingInvoices: "Λείπουν τιμολόγια",
        unmatchedTransactions: "Αταίριαστες συναλλαγές",
        monthlyReport: "Μηνιαία αναφορά έτοιμη",
        markAsRead: "Σήμανση ως αναγνωσμένο",
        viewDetails: "Προβολή Λεπτομερειών",
    },

    // Proforma
    proforma: {
        title: "Προτιμολόγιο",
        invoiceNumber: "Αριθμός Τιμολογίου",
        issueDate: "Ημερομηνία Έκδοσης",
        invoiceTo: "Προς",
        payTo: "Πληρωμή σε",
        serviceDescription: "Περιγραφή Υπηρεσίας",
        price: "Τιμή",
        tax: "ΦΠΑ (%)",
        total: "Σύνολο",
        subtotal: "Υποσύνολο",
        discount: "Έκπτωση",
        termsConditions: "Όροι & Προϋποθέσεις",
        waysToPay: "Τρόποι Πληρωμής",
        cash: "Μετρητά",
        bankTransfer: "Τραπεζική Μεταφορά",
        downloadPDF: "Λήψη PDF",
        sendEmail: "Αποστολή Email",
    },
};

// English translations (default)
export const en = {
    nav: {
        packages: "Packages",
        dashboard: "Dashboard",
        suppliers: "Suppliers",
        customers: "Customers",
        bankSync: "Bank Sync",
        exportHub: "Export Hub",
        analytics: "Analytics",
        proforma: "New Proforma",
        manageProformas: "Manage Proformas",
        settings: "Settings",
    },
    common: {
        save: "Save",
        cancel: "Cancel",
        delete: "Delete",
        edit: "Edit",
        add: "Add",
        search: "Search",
        filter: "Filter",
        export: "Export",
        import: "Import",
        upload: "Upload",
        download: "Download",
        loading: "Loading...",
        noData: "No data available",
        confirm: "Confirm",
        actions: "Actions",
        date: "Date",
        amount: "Amount",
        status: "Status",
        type: "Type",
        notes: "Notes",
    },
    // ... (keeping existing English as reference, Greek is priority)
};

export type Language = "en" | "el";

export const translations = { en, el };

export default translations;
