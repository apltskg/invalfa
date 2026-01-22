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

    // 1. Add Logo
    try {
        const logoUrl = agencySettings.logo_url || PDF_CONSTANTS.logoUrl;

        // We need to fetch the image to add it to PDF, or use an `img` element if running in browser
        // Since this runs in browser:
        const img = new Image();
        img.src = logoUrl;
        // Wait for load? In a sync function it's hard. 
        // Better approach for browser-side jsPDF with remote images:
        // Ideally we convert to base64. 
        // For simplicity in this environment, let's try strict addImage if allow-origin permits, 
        // otherwise we might need a proxy or base64 string.
        // Assuming allow-origin is okay or cached.

        // NOTE: addImage with URL is async-ish or requires arraybuffer. 
        // PRO TIP: Use a pre-loaded base64 if possible. 
        // For this task, we'll try to add it. If it fails, we fallback to text.
        doc.addImage(img, 'PNG', 20, 15, 50, 15);
    } catch (e) {
        console.warn("Could not add logo image to PDF, falling back to text", e);
        doc.setFontSize(20);
        doc.setFont("helvetica", "bold");
        doc.text(agencySettings.company_name || "ALFA TRAVEL", 20, 25);
    }

    // Header Right
    doc.setFontSize(16);
    doc.setTextColor(40, 40, 40);
    doc.setFont("helvetica", "bold");
    doc.text("PROFORMA INVOICE", 200, 25, { align: "right" });

    // Invoice Meta
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100, 100, 100);

    doc.text("Invoice number", 160, 35, { align: "right" });
    doc.setTextColor(0, 0, 0);
    doc.text(data.invoiceNumber, 200, 35, { align: "right" });

    doc.setTextColor(100, 100, 100);
    doc.text("Issue date", 160, 42, { align: "right" });
    doc.setTextColor(0, 0, 0);
    doc.text(data.issueDate, 200, 42, { align: "right" });

    // Grid: Invoice To (Left) vs Pay To (Right)
    const yStart = 60;

    // Invoice To
    doc.setFontSize(9);
    doc.setTextColor(150, 150, 150);
    doc.setFont("helvetica", "bold");
    doc.text("INVOICE TO:", 20, yStart);

    doc.setTextColor(0, 0, 0);
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text(data.clientName || "Client Name", 20, yStart + 8);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    if (data.clientAddress) {
        const addressLines = doc.splitTextToSize(data.clientAddress, 70);
        doc.text(addressLines, 20, yStart + 14);
    }
    if (data.clientEmail) {
        doc.text(data.clientEmail, 20, yStart + 24);
    }
    if (data.clientVatNumber) {
        doc.text(`VAT: ${data.clientVatNumber}`, 20, yStart + 30);
    }

    // Pay To (Right side)
    doc.setTextColor(150, 150, 150);
    doc.setFont("helvetica", "bold");
    doc.text("PAY TO:", 200, yStart, { align: "right" });

    doc.setTextColor(0, 0, 0);
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.text(agencySettings.company_name, 200, yStart + 8, { align: "right" });

    doc.setFont("helvetica", "normal");
    const agencyAddr = doc.splitTextToSize(agencySettings.address, 70);
    doc.text(agencyAddr, 200, yStart + 14, { align: "right" });

    doc.text(agencySettings.phone, 200, yStart + 24, { align: "right" });
    doc.text(agencySettings.email, 200, yStart + 29, { align: "right" });
    doc.text(`VAT: ${agencySettings.vat_number}`, 200, yStart + 34, { align: "right" });


    // Table
    const tableData = data.lineItems.map(item => [
        item.description,
        `€${item.price.toFixed(2)}`,
        `${item.taxPercent}%`,
        `€${item.total.toFixed(2)}`
    ]);

    autoTable(doc, {
        startY: yStart + 50,
        head: [["DESCRIPTION", "PRICE", "TAX", "TOTAL"]],
        body: tableData,
        theme: "plain",
        headStyles: {
            fillColor: [255, 255, 255],
            textColor: [150, 150, 150],
            fontStyle: 'bold',
            fontSize: 8,
            halign: 'left'
        },
        columnStyles: {
            0: { cellWidth: 'auto' },
            1: { halign: 'right' },
            2: { halign: 'right' },
            3: { halign: 'right' }
        },
        styles: {
            fontSize: 9,
            cellPadding: 6,
            lineColor: [240, 240, 240],
            lineWidth: { bottom: 0.1 }
        },
    });

    // Totals
    const finalY = (doc as any).lastAutoTable.finalY + 10;
    const rightColX = 200;

    doc.setFontSize(9);
    doc.text(`Subtotal:`, 150, finalY, { align: "right" });
    doc.text(`€${data.subtotal.toFixed(2)}`, rightColX, finalY, { align: "right" });

    let currentY = finalY;

    if (data.discountAmount > 0) {
        currentY += 6;
        doc.text(`Discount (${data.discountPercent}%):`, 150, currentY, { align: "right" });
        doc.text(`-€${data.discountAmount.toFixed(2)}`, rightColX, currentY, { align: "right" });
    }

    currentY += 6;
    doc.text(`Tax:`, 150, currentY, { align: "right" });
    doc.text(`€${data.taxAmount.toFixed(2)}`, rightColX, currentY, { align: "right" });

    currentY += 10;
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text(`Total:`, 150, currentY, { align: "right" });
    doc.text(`€${data.total.toFixed(2)}`, rightColX, currentY, { align: "right" });

    // Bank Accounts Section
    let notesY = finalY + 40;

    if (data.acceptBankTransfer) {
        doc.setFontSize(9);
        doc.setFont("helvetica", "bold");
        doc.text("Payment Methods:", 20, notesY);
        notesY += 6;

        doc.setFontSize(8);
        doc.setFont("helvetica", "normal");

        BANK_ACCOUNTS.forEach(acc => {
            doc.setFont("helvetica", "bold");
            doc.text(acc.bank, 20, notesY);
            doc.setFont("helvetica", "normal");

            const lines = doc.splitTextToSize(acc.details, 100);
            doc.text(lines, 20, notesY + 5);
            notesY += 15 + (lines.length * 3);
        });
    }

    // Notes
    if (data.notes) {
        doc.setFont("helvetica", "italic");
        doc.setFontSize(8);
        doc.setTextColor(100, 100, 100);
        const noteLines = doc.splitTextToSize(data.notes, 170);
        doc.text("Notes:", 20, notesY);
        doc.text(noteLines, 20, notesY + 5);
    }

    // Footer
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    const footerY = 280;
    doc.text("Thank you for your business!", 105, footerY, { align: "center" });

    return doc;
}

export function downloadProformaPDF(data: ProformaData, agencySettings: AgencySettings) {
    generateProformaPDF(data, agencySettings).then(doc => {
        doc.save(`Proforma_${data.invoiceNumber}_${data.clientName.replace(/\s/g, "_")}.pdf`);
    });
}
