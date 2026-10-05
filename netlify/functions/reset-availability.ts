/**
 * Scheduled: 06:00 UTC ≈ 00:00 America/Mexico_City.
 * Limpia sold_out para reactivar el menú público cada madrugada.
 * Env: SUPABASE_URL (o VITE_SUPABASE_URL) + SUPABASE_SERVICE_ROLE_KEY
 */
export default async (req: Request) => {
  try {
    await req.json();
  } catch {
    /* payload opcional del scheduler */
  }

  const url =
    (typeof Netlify !== "undefined" && Netlify.env?.get("SUPABASE_URL")) ||
    (typeof Netlify !== "undefined" && Netlify.env?.get("VITE_SUPABASE_URL")) ||
    "";
  const key =
    (typeof Netlify !== "undefined" && Netlify.env?.get("SUPABASE_SERVICE_ROLE_KEY")) || "";

  if (!url || !key) {
    return new Response(JSON.stringify({ ok: false, error: "Faltan variables de Supabase" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  const res = await fetch(`${url}/rest/v1/rpc/reset_daily_availability`, {
    method: "POST",
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: "{}",
  });

  const text = await res.text();
  return new Response(text || JSON.stringify({ ok: res.ok }), {
    status: res.status,
    headers: { "Content-Type": "application/json" },
  });
};

export const config = {
  schedule: "0 6 * * *",
};
