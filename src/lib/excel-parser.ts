import * as XLSX from 'xlsx';

export interface ParsedInvoiceRow {
  date: Date | null;
  invoiceNumber: string;
  mydataCode: string;
  clientName: string;
  clientVat: string;
  netAmount: number;
  vatAmount: number;
  totalAmount: number;
  mydataMark: string;
}

export interface ParsedInvoiceData {
  rows: ParsedInvoiceRow[];
  totals: {
    net: number;
    vat: number;
    gross: number;
  };
  columnMapping: Record<string, number>;
  validationPassed: boolean;
  validationMessage: string;
}

// Greek column header patterns for auto-detection (expanded for various invoicing software)
const COLUMN_PATTERNS = {
  date: [
    'ημερ/νία', 'ημερομηνία', 'date', 'ημερ', 'ημ/νια', 'ημ.', 'ημερ.',
    'ημ/νία παραστατικού', 'ημνια', 'hmeromhnia', 'ημ παραστ'
  ],
  invoiceNumber: [
    'παραστατικό', 'αριθμός', 'invoice', 'τιμολόγιο', 'παραστατικό/mydata',
    'αρ.', 'αρ. παραστ', 'αρ. τιμ', 'αριθ.', 'αρ. παραστατικού',
    'σειρά/αριθμ', 'κωδ. παραστ', 'invoice no', 'doc no', 'αρ.παρ.'
  ],
  clientName: [
    'επωνυμία', 'πελάτης', 'client', 'company', 'όνομα', 'επωνυμια',
    'επων.', 'πελατης', 'customer', 'counterpart', 'αντισυμβαλλόμενος',
    'αντισυμβ.', 'εκδότης', 'εταιρεία', 'onoma', 'client name'
  ],
  clientVat: [
    'α.φ.μ.', 'αφμ', 'vat', 'afm', 'α.φ.μ', 'αφμ.', 'vat no',
    'tax id', 'αριθμός φορολ', 'φορ. μητρώο', 'tin', 'αφμ πελ'
  ],
  netAmount: [
    'καθαρή αξία', 'καθαρή', 'net', 'καθ. αξία', 'καθ.αξία',
    'αξία χωρίς φπα', 'net amount', 'αξία', 'ποσό χωρίς',
    'καθαρά', 'καθ αξια', 'base amount', 'καθ.', 'αξια καθ'
  ],
  vatAmount: [
    'αξία φ.π.α.', 'φ.π.α.', 'φπα', 'vat amount', 'αξία φπα',
    'φ.π.α', 'ποσό φπα', 'vat', 'tax', 'φορος', 'φόρος',
    'ποσό φ.π.α.', 'fpa', 'αξ.φπα', 'φ.π.α'
  ],
  totalAmount: [
    'συνολ. αξία', 'σύνολο', 'total', 'συνολική', 'συν. αξία',
    'συνολικό ποσό', 'gross', 'τελικό ποσό', 'total amount',
    'πληρωτέο', 'σύν.', 'αξία με φπα', 'συν αξια', 'grand total',
    'πληρωτέο ποσό', 'αξ.+φπα', 'αξία συνολ', 'syn'
  ],
  mydataMark: [
    'mark', 'mydata mark', 'μαρκ', 'mydata', 'uid', 'μοναδικός',
    'μαρκα', 'αναγνωριστικό', 'mydata uid', 'μον. αναγν.'
  ],
};

function normalizeHeader(header: string): string {
  return header
    .toLowerCase()
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, ''); // Remove diacritics
}

function findColumnIndex(headers: string[], patterns: string[]): number {
  for (let i = 0; i < headers.length; i++) {
    const normalized = normalizeHeader(headers[i]);
    for (const pattern of patterns) {
      if (normalized.includes(normalizeHeader(pattern))) {
        return i;
      }
    }
  }
  return -1;
}

function parseGreekNumber(value: any): number {
  if (typeof value === 'number') return value;
  if (!value) return 0;

  let str = String(value).trim();

  // Handle negative numbers in parentheses format: (1.234,56) = -1234.56
  const isNegativeParens = str.startsWith('(') && str.endsWith(')');
  if (isNegativeParens) {
    str = str.slice(1, -1);
  }

  // Check for leading minus
  const isNegativeMinus = str.startsWith('-');
  if (isNegativeMinus) {
    str = str.slice(1);
  }

  // Clean up the number
  str = str
    .replace(/\s/g, '')     // Remove spaces
    .replace(/€/g, '')      // Remove euro symbol
    .replace(/EUR/gi, '')   // Remove EUR text
    .replace(/[^\d.,\-]/g, ''); // Keep only digits, dots, commas

  // Detect format: Greek uses dot for thousands, comma for decimals
  // If there's a comma after the last dot, it's Greek format
  const lastDot = str.lastIndexOf('.');
  const lastComma = str.lastIndexOf(',');

  if (lastComma > lastDot) {
    // Greek format: 1.234,56 -> 1234.56
    str = str.replace(/\./g, '').replace(/,/g, '.');
  } else if (lastDot > lastComma && lastComma === -1) {
    // US format or no decimals: 1234.56 or 1234
    // Keep as-is
  } else if (lastDot > lastComma) {
    // Mixed or US format: 1,234.56 -> 1234.56
    str = str.replace(/,/g, '');
  }

  const num = parseFloat(str);
  const result = isNaN(num) ? 0 : num;

  return (isNegativeParens || isNegativeMinus) ? -result : result;
}

function parseGreekDate(value: any): Date | null {
  if (!value) return null;

  // If it's already a Date object
  if (value instanceof Date) return value;

  // If it's an Excel serial number
  if (typeof value === 'number') {
    const excelEpoch = new Date(1899, 11, 30);
    const date = new Date(excelEpoch.getTime() + value * 24 * 60 * 60 * 1000);
    return date;
  }

  const str = String(value).trim();

  // Try DD/MM/YYYY format (Greek standard)
  const ddmmyyyy = str.match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})$/);
  if (ddmmyyyy) {
    return new Date(
      parseInt(ddmmyyyy[3]),
      parseInt(ddmmyyyy[2]) - 1,
      parseInt(ddmmyyyy[1])
    );
  }

  // Try YYYY-MM-DD format (ISO)
  const yyyymmdd = str.match(/^(\d{4})[\/\-\.](\d{1,2})[\/\-\.](\d{1,2})$/);
  if (yyyymmdd) {
    return new Date(
      parseInt(yyyymmdd[1]),
      parseInt(yyyymmdd[2]) - 1,
      parseInt(yyyymmdd[3])
    );
  }

  return null;
}

function parseInvoiceNumberWithMydata(value: string): { invoiceNumber: string; mydataCode: string } {
  if (!value) return { invoiceNumber: '', mydataCode: '' };

  const str = String(value).trim();

  // Pattern: "ΤΠΥ-369 369" or "ΤΠΥ-369"
  const parts = str.split(/\s+/);
  if (parts.length >= 2) {
    return {
      invoiceNumber: parts[0],
      mydataCode: parts.slice(1).join(' '),
    };
  }

  return { invoiceNumber: str, mydataCode: '' };
}

export function parseInvoiceExcel(file: File): Promise<ParsedInvoiceData> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array', cellDates: true });

        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData = XLSX.utils.sheet_to_json(firstSheet, { header: 1 }) as any[][];

        if (jsonData.length < 2) {
          reject(new Error('Το αρχείο είναι κενό ή δεν περιέχει δεδομένα'));
          return;
        }

        // Find header row (first non-empty row with multiple cells)
        let headerRowIndex = 0;
        for (let i = 0; i < Math.min(10, jsonData.length); i++) {
          const row = jsonData[i];
          if (row && row.filter(cell => cell != null && cell !== '').length >= 3) {
            headerRowIndex = i;
            break;
          }
        }

        const headers = (jsonData[headerRowIndex] || []).map(h => String(h || ''));

        // Auto-detect column mapping
        const columnMapping: Record<string, number> = {
          date: findColumnIndex(headers, COLUMN_PATTERNS.date),
          invoiceNumber: findColumnIndex(headers, COLUMN_PATTERNS.invoiceNumber),
          clientName: findColumnIndex(headers, COLUMN_PATTERNS.clientName),
          clientVat: findColumnIndex(headers, COLUMN_PATTERNS.clientVat),
          netAmount: findColumnIndex(headers, COLUMN_PATTERNS.netAmount),
          vatAmount: findColumnIndex(headers, COLUMN_PATTERNS.vatAmount),
          totalAmount: findColumnIndex(headers, COLUMN_PATTERNS.totalAmount),
          mydataMark: findColumnIndex(headers, COLUMN_PATTERNS.mydataMark),
        };

        const rows: ParsedInvoiceRow[] = [];
        let calculatedTotals = { net: 0, vat: 0, gross: 0 };
        let footerTotals = { net: 0, vat: 0, gross: 0 };

        // Process data rows
        for (let i = headerRowIndex + 1; i < jsonData.length; i++) {
          const row = jsonData[i];
          if (!row || row.length === 0) continue;

          // Check if this is a footer row (contains "Καθ." or "Σύν." totals)
          const firstCell = String(row[0] || '').toLowerCase();
          if (firstCell.includes('καθ.') || firstCell.includes('σύν.') || firstCell.includes('σύνολο')) {
            // This might be a footer with totals
            // Try to extract totals from this row
            if (columnMapping.netAmount >= 0 && row[columnMapping.netAmount]) {
              footerTotals.net = parseGreekNumber(row[columnMapping.netAmount]);
            }
            if (columnMapping.vatAmount >= 0 && row[columnMapping.vatAmount]) {
              footerTotals.vat = parseGreekNumber(row[columnMapping.vatAmount]);
            }
            if (columnMapping.totalAmount >= 0 && row[columnMapping.totalAmount]) {
              footerTotals.gross = parseGreekNumber(row[columnMapping.totalAmount]);
            }
            continue;
          }

          // Skip empty rows or rows without a date/invoice
          const dateVal = columnMapping.date >= 0 ? row[columnMapping.date] : null;
          const invoiceVal = columnMapping.invoiceNumber >= 0 ? row[columnMapping.invoiceNumber] : null;

          if (!dateVal && !invoiceVal) continue;

          const { invoiceNumber, mydataCode } = parseInvoiceNumberWithMydata(
            columnMapping.invoiceNumber >= 0 ? row[columnMapping.invoiceNumber] : ''
          );

          const netAmount = columnMapping.netAmount >= 0 ? parseGreekNumber(row[columnMapping.netAmount]) : 0;
          const vatAmount = columnMapping.vatAmount >= 0 ? parseGreekNumber(row[columnMapping.vatAmount]) : 0;
          const totalAmount = columnMapping.totalAmount >= 0 ? parseGreekNumber(row[columnMapping.totalAmount]) : 0;

          calculatedTotals.net += netAmount;
          calculatedTotals.vat += vatAmount;
          calculatedTotals.gross += totalAmount;

          rows.push({
            date: parseGreekDate(dateVal),
            invoiceNumber,
            mydataCode,
            clientName: columnMapping.clientName >= 0 ? String(row[columnMapping.clientName] || '') : '',
            clientVat: columnMapping.clientVat >= 0 ? String(row[columnMapping.clientVat] || '') : '',
            netAmount,
            vatAmount,
            totalAmount,
            mydataMark: columnMapping.mydataMark >= 0 ? String(row[columnMapping.mydataMark] || '') : '',
          });
        }

        // Validate totals
        let validationPassed = true;
        let validationMessage = 'Τα σύνολα ταιριάζουν ✓';

        if (footerTotals.gross > 0) {
          const tolerance = 0.02; // 2 cents tolerance
          const grossDiff = Math.abs(calculatedTotals.gross - footerTotals.gross);

          if (grossDiff > tolerance) {
            validationPassed = false;
            validationMessage = `Προειδοποίηση: Διαφορά στα σύνολα (Υπολογισμένο: €${calculatedTotals.gross.toFixed(2)}, Αρχείο: €${footerTotals.gross.toFixed(2)})`;
          }
        } else {
          validationMessage = 'Δεν βρέθηκαν σύνολα για επαλήθευση';
        }

        resolve({
          rows,
          totals: calculatedTotals,
          columnMapping,
          validationPassed,
          validationMessage,
        });

      } catch (error) {
        console.error('Excel parsing error:', error);
        reject(new Error('Σφάλμα ανάγνωσης αρχείου Excel'));
      }
    };

    reader.onerror = () => reject(new Error('Αποτυχία φόρτωσης αρχείου'));
    reader.readAsArrayBuffer(file);
  });
}
