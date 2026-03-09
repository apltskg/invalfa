// Main application configuration
// Update these values to customize the application for your business

export const APP_CONFIG = {
  // Company Information
  company: {
    name: "Your Travel Agency",
    logoUrl: "/logo.png",
    vatNumber: "999999999",
    email: "info@youragency.com",
    phone: "+30 123 456 7890",
    address: "123 Travel Street, City, Country",
    website: "https://youragency.com"
  },

  // Localization Settings
  locale: {
    defaultLanguage: "en" as "en" | "el",
    currency: "EUR",
    dateFormat: {
      year: "numeric",
      month: "2-digit",
      day: "2-digit"
    } as Intl.DateTimeFormatOptions
  },

  // Feature Toggles
  features: {
    aiExtraction: true,          // AI-powered invoice data extraction
    bankSync: true,              // Bank statement synchronization
    greekIntegrations: false,    // myDATA, AFM verification (Greece-specific)
    multiCurrency: false,        // Multiple currency support
    emailNotifications: true,    // Automated email notifications
    advancedAnalytics: true,     // Advanced reporting and analytics
    clientPortal: true,          // Customer portal access
    mobileApp: true              // Mobile application features
  },

  // Business Settings
  business: {
    vatRate: 0.24,              // Default VAT rate (24% for Greece)
    defaultExpenseCategories: [
      "tolls",
      "fuel", 
      "personal",
      "services",
      "tires",
      "workshops",
      "transport",
      "other"
    ],
    // Available languages for the interface
    supportedLanguages: ["en", "el"] as const
  },

  // Theme & Branding
  theme: {
    primaryColor: "hsl(221.2, 84%, 51%)",
    borderRadius: "0.5rem",
    fontFamily: "Inter, system-ui, sans-serif"
  },

  // Integration Settings
  integrations: {
    // Enable/disable specific bank integrations
    supportedBanks: ["eurobank", "alpha", "piraeus", "national", "viva", "wise"],
    // Email service configuration
    emailProvider: "resend", // or "sendgrid", "mailgun"
    // AI service for data extraction
    aiProvider: "gemini" // or "openai", "anthropic"
  }
} as const;

export type AppConfig = typeof APP_CONFIG;