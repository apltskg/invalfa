import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export interface AgencySettings {
    company_name: string;
    vat_number: string;
    address: string;
    phone: string;
    email: string;
    iban: string;
    swift: string;
    bank_name: string;
    logo_url: string;
}

export interface ProformaData {
    invoiceNumber: string;
    issueDate: string;
    clientName: string;
    clientAddress: string;
    clientEmail: string;
    clientVatNumber: string;
    lineItems: Array<{
        description: string;
        price: number;
        taxPercent: number;
        total: number;
    }>;
    subtotal: number;
    discountPercent: number;
    discountAmount: number;
    taxAmount: number;
    total: number;
    acceptCash: boolean;
    acceptBankTransfer: boolean;
    notes: string;
}

// Fixed constants for PDF generation if settings aren't fully provided
const PDF_CONSTANTS = {
    logoUrl: "https://atravel.gr/wp-content/uploads/2023/07/Alfa-Logo-Horizontal-Retina.png",
    logoWidth: 50,
    logoHeight: 15, // Approximate ratio
};

const BANK_ACCOUNTS = [
    {
        bank: "Eurobank",
        details: "IBAN: GR3602607330008902011511103\nBIC: ERBKGRAA"
    },
    {
        bank: "ALPHA Bank",
        details: "IBAN: GR7201407070707002002020365\nBIC: CRBAGRAA"
    },
    {
        bank: "International (Wise)",
        details: "IBAN: BE24 9050 7266 5838\nSWIFT: TRWIBEB1XXX\nBank: Wise, Rue du Trône 100, Brussels 1050, Belgium"
    }
];

export async function generateProformaPDF(data: ProformaData, agencySettings: AgencySettings) {
    const doc = new jsPDF();
    const primaryColor = [37, 99, 235]; // Blue 600

    // Add Logo
    try {
        const img = new Image();
        img.src = agencySettings.logo_url || PDF_CONSTANTS.logoUrl;
        doc.addImage(img, 'PNG', 20, 15, 45, 12);
    } catch (e) {
        doc.setFontSize(22);
        doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
        doc.setFont("helvetica", "bold");
        doc.text(agencySettings.company_name || "ALFA TRAVEL", 20, 25);
    }

    // Header Right
    doc.setFontSize(10);
    doc.setTextColor(150, 150, 150);
    doc.setFont("helvetica", "bold");
    doc.text("PROFORMA INVOICE", 190, 20, { align: "right" });

    doc.setFontSize(14);
    doc.setTextColor(0, 0, 0);
    doc.text(data.invoiceNumber, 190, 28, { align: "right" });

    // Client Info
    const startY = 50;
    doc.setDrawColor(240, 240, 240);
    doc.line(20, startY - 5, 190, startY - 5);

    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text("BILL TO", 20, startY);
    doc.text("ISSUED ON", 190, startY, { align: "right" });

    doc.setFontSize(10);
    doc.setTextColor(0, 0, 0);
    doc.setFont("helvetica", "bold");
    doc.text(data.clientName || "Client Name", 20, startY + 7);
    doc.text(data.issueDate, 190, startY + 7, { align: "right" });

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(100, 100, 100);
    const clientDetails = [
        data.clientAddress,
        data.clientVatNumber ? `VAT: ${data.clientVatNumber}` : null,
        data.clientEmail
    ].filter(Boolean) as string[];
    doc.text(clientDetails, 20, startY + 14);

    // Table
    autoTable(doc, {
        startY: startY + 35,
        head: [["Description", "Tax", "Price", "Total"]],
        body: data.lineItems.map(item => [
            item.description,
            `${item.taxPercent}%`,
            `€${item.price.toFixed(2)}`,
            `€${item.total.toFixed(2)}`
        ]),
        headStyles: {
            fillColor: [249, 250, 251],
            textColor: [107, 114, 128],
            fontSize: 8,
            fontStyle: 'bold',
            halign: 'left'
        },
        styles: {
            fontSize: 9,
            cellPadding: 5
        },
        columnStyles: {
            1: { halign: 'right' },
            2: { halign: 'right' },
            3: { halign: 'right', fontStyle: 'bold' }
        }
    });

    const finalY = (doc as any).lastAutoTable.finalY + 10;

    // Totals
    doc.setFontSize(10);
    doc.text("Subtotal", 140, finalY);
    doc.text(`€${data.subtotal.toFixed(2)}`, 190, finalY, { align: "right" });

    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.text("Total Amount Due", 140, finalY + 15);
    doc.text(`€${data.total.toFixed(2)}`, 190, finalY + 15, { align: "right" });

    // Bank Details
    if (data.acceptBankTransfer) {
        doc.setFontSize(8);
        doc.setTextColor(150, 150, 150);
        doc.text("PAYMENT INSTRUCTIONS", 20, finalY + 40);

        doc.setTextColor(0, 0, 0);
        doc.setFont("helvetica", "bold");
        let bankY = finalY + 48;
        BANK_ACCOUNTS.forEach(bank => {
            doc.text(bank.bank, 20, bankY);
            doc.setFont("helvetica", "normal");
            doc.setFontSize(7);
            doc.text(bank.details, 20, bankY + 4);
            bankY += 15;
            doc.setFont("helvetica", "bold");
            doc.setFontSize(8);
        });
    }

    // Footer
    doc.setFontSize(8);
    doc.setTextColor(180, 180, 180);
    doc.text("This is a computer-generated document.", 105, 285, { align: "center" });

    return doc;
}

export function downloadProformaPDF(data: ProformaData, agencySettings: AgencySettings) {
    generateProformaPDF(data, agencySettings).then(doc => {
        doc.save(`Proforma_${data.invoiceNumber}_${data.clientName.replace(/\s/g, "_")}.pdf`);
    });
}
