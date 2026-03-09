import { useEffect } from "react";

interface SEOHeadProps {
  title: string;
  description: string;
  canonicalUrl: string;
  ogImage?: string;
  lang?: string;
  alternateLang?: { href: string; hreflang: string };
}

/**
 * Dynamically sets document <head> meta tags for SEO.
 * Call once per page component.
 */
export function useSEOHead({
  title,
  description,
  canonicalUrl,
  ogImage = "/og-image.jpg",
  lang = "en",
  alternateLang,
}: SEOHeadProps) {
  useEffect(() => {
    // Title
    document.title = title;
    document.documentElement.lang = lang;

    const setMeta = (attr: string, key: string, content: string) => {
      let el = document.querySelector(`meta[${attr}="${key}"]`) as HTMLMetaElement | null;
      if (!el) {
        el = document.createElement("meta");
        el.setAttribute(attr, key);
        document.head.appendChild(el);
      }
      el.setAttribute("content", content);
    };

    const setLink = (rel: string, href: string, extra?: Record<string, string>) => {
      const selector = extra
        ? `link[rel="${rel}"][hreflang="${extra.hreflang}"]`
        : `link[rel="${rel}"]:not([hreflang])`;
      let el = document.querySelector(selector) as HTMLLinkElement | null;
      if (!el) {
        el = document.createElement("link");
        el.rel = rel;
        if (extra) Object.entries(extra).forEach(([k, v]) => el!.setAttribute(k, v));
        document.head.appendChild(el);
      }
      el.href = href;
    };

    const origin = window.location.origin;
    const fullOg = ogImage.startsWith("http") ? ogImage : `${origin}${ogImage}`;
    const fullCanonical = canonicalUrl.startsWith("http") ? canonicalUrl : `${origin}${canonicalUrl}`;

    // Standard meta
    setMeta("name", "description", description);
    setMeta("name", "author", "invalfa");

    // Open Graph
    setMeta("property", "og:title", title);
    setMeta("property", "og:description", description);
    setMeta("property", "og:type", "website");
    setMeta("property", "og:url", fullCanonical);
    setMeta("property", "og:image", fullOg);
    setMeta("property", "og:image:width", "1200");
    setMeta("property", "og:image:height", "630");
    setMeta("property", "og:locale", lang === "el" ? "el_GR" : "en_US");

    // Twitter
    setMeta("name", "twitter:card", "summary_large_image");
    setMeta("name", "twitter:title", title);
    setMeta("name", "twitter:description", description);
    setMeta("name", "twitter:image", fullOg);

    // Canonical
    setLink("canonical", fullCanonical);

    // Alternate language
    if (alternateLang) {
      setLink("alternate", `${origin}${alternateLang.href}`, { hreflang: alternateLang.hreflang });
    }

    // JSON-LD
    let jsonLd = document.querySelector('script[data-seo-jsonld]') as HTMLScriptElement | null;
    if (!jsonLd) {
      jsonLd = document.createElement("script");
      jsonLd.type = "application/ld+json";
      jsonLd.setAttribute("data-seo-jsonld", "true");
      document.head.appendChild(jsonLd);
    }
    jsonLd.textContent = JSON.stringify({
      "@context": "https://schema.org",
      "@type": "SoftwareApplication",
      name: "invalfa",
      applicationCategory: "BusinessApplication",
      operatingSystem: "Web",
      description,
      url: fullCanonical,
      image: fullOg,
      offers: {
        "@type": "Offer",
        price: "49",
        priceCurrency: "EUR",
      },
    });
  }, [title, description, canonicalUrl, ogImage, lang, alternateLang]);
}
