export default {
  async fetch(): Promise<Response> {
    return new Response(null, { status: 404 });
  },

  async scheduled(controller, env): Promise<void> {
    const url = env.SUPABASE_URL;
    const key = env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) {
      console.error(JSON.stringify({ ok: false, error: "Faltan secretos de Supabase" }));
      controller.noRetry();
      return;
    }

    const res = await fetch(`${url.replace(/\/$/, "")}/rest/v1/rpc/reset_daily_availability`, {
      method: "POST",
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: "{}",
    });

    if (!res.ok) {
      const body = await res.text();
      console.error(JSON.stringify({ ok: false, status: res.status, body }));
      throw new Error("reset_daily_availability failed");
    }

    console.log(JSON.stringify({ ok: true, cron: controller.cron }));
  },
} satisfies ExportedHandler<Env>;
