import { Navigate } from "react-router-dom";

/**
 * Detects browser language and redirects to the appropriate landing page.
 * Greek speakers → /landing, everyone else → /landing/en
 */
export default function LandingRedirect() {
  const lang = navigator.language || (navigator as any).userLanguage || "en";
  const isGreek = lang.startsWith("el");
  return <Navigate to={isGreek ? "/landing" : "/landing/en"} replace />;
}
