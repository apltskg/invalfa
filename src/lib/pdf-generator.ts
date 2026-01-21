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
        taxPercent: number total: number;
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

export function generateProformaPDF(data: ProformaData, agencySettings: AgencySettings) {
    const doc = new jsPDF();

    // Header
    doc.setFontSize(20);
    doc.setFont("helvetica", "bold");
    doc.text(agencySettings.company_name || "ALFA MONOPROSOPI I.K.E.", 20, 20);

    doc.setFontSize(16);
    doc.setTextColor(100, 100, 255);
    doc.text("PROFORMA INVOICE", 200, 20, { align: "right" });

    // Agency Details
    doc.setFontSize(9);
    doc.setTextColor(80, 80, 80);
    doc.setFont("helvetica", "normal");
    doc.text(agencySettings.address || "Address", 20, 30);
    doc.text(`Phone: ${agencySettings.phone || "N/A"}`, 20, 35);
    doc.text(`Email: ${agencySettings.email || "N/A"}`, 20, 40);
    doc.text(`VAT: ${agencySettings.vat_number || "N/A"}`, 20, 45);

    // Invoice Info  doc.setTextColor(0, 0, 0);
    doc.text(`Invoice #: ${data.invoiceNumber}`, 200, 30, { align: "right" });
    doc.text(`Date: ${data.issueDate}`, 200, 35, { align: "right" });

    // Client Info
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text("Bill To:", 20, 60);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.text(data.clientName || "Client Name", 20, 65);
    if (data.clientAddress) {
        const addressLines = doc.splitTextToSize(data.clientAddress, 60);
        doc.text(addressLines, 20, 70);
    }
    if (data.clientVatNumber) {
        doc.text(`VAT: ${data.clientVatNumber}`, 20, 80);
    }

    // Line Items Table
    const tableData = data.lineItems.map(item => [
        item.description,
        `€${item.price.toFixed(2)}`,
        `${item.taxPercent}%`,
        `€${item.total.toFixed(2)}`
    ]);

    autoTable(doc, {
        startY: 95,
        head: [["Description", "Price", "Tax", "Total"]],
        body: tableData,
        theme: "striped",
        headStyles: { fillColor: [100, 100, 255] },
        styles: { fontSize: 9 },
    });

    // Totals
    const finalY = (doc as any).lastAutoTable.finalY + 10;

    doc.setFontSize(10);
    doc.text(`Subtotal: €${data.subtotal.toFixed(2)}`, 200, finalY, { align: "right" });

    if (data.discountAmount > 0) {
        doc.text(`Discount (${data.discountPercent}%): -€${data.discountAmount.toFixed(2)}`, 200, finalY + 5, { align: "right" });
    }

    doc.text(`Tax: €${data.taxAmount.toFixed(2)}`, 200, finalY + (data.discountAmount > 0 ? 10 : 5), { align: "right" });

    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text(`TOTAL: €${data.total.toFixed(2)}`, 200, final Y + (data.discountAmount > 0 ? 18 : 13), { align: "right" });

    // Bank Details
    if (data.acceptBankTransfer && agencySettings.iban) {
        doc.setFont("helvetica", "bold");
        doc.setFontSize(10);
        doc.text("Bank Details:", 20, finalY + 25);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(9);
        doc.text(`Bank: ${agencySettings.bank_name || "N/A"}`, 20, finalY + 30);
        doc.text(`IBAN: ${agencySettings.iban}`, 20, finalY + 35);
        if (agencySettings.swift) {
            doc.text(`SWIFT: ${agencySettings.swift}`, 20, finalY + 40);
        }
    }

    // Notes
    if (data.notes) {
        doc.setFont("helvetica", "italic");
        doc.setFontSize(8);
        doc.setTextColor(100, 100, 100);
        const notesY = finalY + (data.acceptBankTransfer ? 50 : 30);
        const noteLines = doc.splitTextToSize(data.notes, 170);
        doc.text(noteLines, 20, notesY);
    }

    // Footer
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text("Thank you for your business!", 105, 280, { align: "center" });

    return doc;
}

export function downloadProformaPDF(data: ProformaData, agencySettings: AgencySettings) {
    const doc = generateProformaPDF(data, agencySettings);
    doc.save(`Proforma_${data.invoiceNumber}_${data.clientName.replace(/\s/g, "_")}.pdf`);
}
