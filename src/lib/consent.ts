const CONSENT_COOKIE = "tv_consent";
const MAX_AGE_SECONDS = 60 * 60 * 24 * 180;

export type Consent = {
  necessary: true;
  map: boolean;
};

export function readConsent(): Consent | null {
  if (typeof document === "undefined") return null;
  const row = document.cookie.split("; ").find((part) => part.startsWith(`${CONSENT_COOKIE}=`));
  if (!row) return null;
  const value = decodeURIComponent(row.slice(CONSENT_COOKIE.length + 1));
  if (value === "all") return { necessary: true, map: true };
  if (value === "necessary") return { necessary: true, map: false };
  return null;
}

export function writeConsent(map: boolean): Consent {
  const next: Consent = { necessary: true, map };
  const secure = window.location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `${CONSENT_COOKIE}=${map ? "all" : "necessary"}; Max-Age=${MAX_AGE_SECONDS}; Path=/; SameSite=Lax${secure}`;
  return next;
}
