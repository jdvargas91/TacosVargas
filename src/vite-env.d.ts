/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string;
  readonly VITE_SUPABASE_PUBLISHABLE_KEY: string;
  readonly VITE_SUPABASE_ANON_KEY?: string;
  /** Número de la tarjeta para el pago por adelantado. No lo dejes en el código. */
  readonly VITE_PAYMENT_CARD_NUMBER?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
