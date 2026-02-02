
# Plan: Improve PDF Invoice Extraction

## Overview
The current PDF reader fails to extract invoice details correctly because it passes PDF files as image URLs to the AI model. Greek invoices are often scanned PDFs or have complex table structures that require proper PDF handling.

---

## Root Cause Analysis

Looking at your database, I see extracted data like:
```json
{"date": null, "amount": null, "category": "other", "merchant": null, "confidence": 0.1}
```

This happens because:
1. The AI receives a PDF via URL but can't properly parse multi-page or scanned documents
2. Greek number formats (1.234,56) and date formats (DD/MM/YYYY) need special handling
3. No fallback when standard extraction fails

---

## Solution: Enhanced PDF Processing

### Technical Changes

#### 1. Upgrade AI Model and PDF Handling
- Switch from `google/gemini-2.0-flash-exp` to `google/gemini-2.5-flash` (more reliable)
- Download PDF bytes and send as base64 with proper `mime_type: "application/pdf"`
- This allows Gemini to properly process multi-page PDFs natively

#### 2. Improved Extraction Logic
```text
+------------------+     +-------------------+     +------------------+
|  Upload PDF      | --> |  Download bytes   | --> |  Base64 encode   |
+------------------+     +-------------------+     +------------------+
                                                           |
                                                           v
+------------------+     +-------------------+     +------------------+
|  Return data     | <-- |  Parse response   | <-- |  Send to Gemini  |
+------------------+     +-------------------+     +------------------+
```

#### 3. Enhanced Prompt for Greek Documents
- Explicit handling of Greek VAT formats (ΑΦΜ with 9 digits)
- Greek number parsing (dot as thousand separator, comma as decimal)
- Better category detection with Greek keywords

#### 4. Better Error Handling & Logging
- Add detailed logging at each step for easier debugging
- Return partial data when some fields are extracted but not all
- Include raw extracted text in response for manual review

---

## Files to Modify

| File | Changes |
|------|---------|
| `supabase/functions/extract-invoice/index.ts` | Complete rewrite with PDF byte processing, upgraded model, enhanced prompts |

---

## What This Fixes
- Scanned PDF invoices will be OCR'd properly
- Multi-page invoices will be fully processed  
- Greek number/date formats will be correctly parsed
- Better extraction accuracy for Greek merchant names and VAT numbers
- Improved debugging with detailed logs

---

## After Implementation
You should upload a test invoice to verify the extraction works correctly with the new implementation.
