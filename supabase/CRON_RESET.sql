-- Programa el "desagotado" diario dentro de Supabase con pg_cron, para no depender
-- de la función programada de Netlify (que requiere variables de entorno y despliegue).
--
-- Ejecuta este archivo UNA VEZ en Supabase → SQL Editor.
-- Corre a las 06:00 UTC = 00:00 en Manzanillo/Colima (UTC-6, sin horario de verano).

-- 1) Habilita pg_cron (en Supabase también puedes activarlo en Database → Extensions).
create extension if not exists pg_cron;

-- 2) Asegura que el rol de postgres pueda ejecutar la función.
grant execute on function public.reset_daily_availability() to postgres;

-- 3) Evita duplicar el job si ya existe.
do $$
begin
  perform cron.unschedule(jobid)
  from cron.job
  where jobname = 'reset_daily_availability';
exception when others then
  null;
end $$;

-- 4) Programa la ejecución diaria.
select cron.schedule(
  'reset_daily_availability',
  '0 6 * * *',
  $$ select public.reset_daily_availability(); $$
);

-- Para verificar:  select * from cron.job;
-- Historial:       select * from cron.job_run_details order by start_time desc limit 10;
