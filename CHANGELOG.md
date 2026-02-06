# Changelog

## [2.2.0] - 2026-02-06

### Features
- **Global Date View Selector**: Added a unified date selector in the header supporting Day, Week, Month, and Year views.
- **Smart Invoice Matching**: Integrated AI-powered matching for the Invoice List page, similar to bank transactions.
- **Enhanced Greek Support**: Improved Excel parsing and AI extraction for Greek invoice formats (dates, numbers, tax IDs).

### Improvements
- **Dashboard**: Refactored to use the global date context.
- **Analytics**: Refactored to use the global date context and filter data dynamically.
- **Export Hub**: Removed redundant month selector, now controlled globally.
- **Invoice List**: Added confidence scoring and "match reasons" for AI suggestions.

### Technical
- Created `MonthContext` with view mode support.
- Created `useInvoiceListMatching` hook.
- Improved `excel-parser.ts` with auto-detection for 40+ Greek column headers.
