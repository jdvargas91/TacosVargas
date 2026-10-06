import { Reveal } from "@/components/Reveal";
import { useSiteContent } from "@/context/SiteContentContext";

export function PaymentNote() {
  const { business } = useSiteContent();
  const card = business.cardPayment;

  return (
    <section id="pago" className="px-4 py-16 md:px-6">
      <Reveal className="card-shadow mx-auto max-w-6xl rounded-2xl bg-smoke px-6 py-10 md:px-12">
        <h2 className="font-display text-4xl leading-[1.05] text-ink">Pago por transferencia</h2>
        <span className="mark" aria-hidden />
        <p className="mt-4 max-w-[65ch] text-clay">{card.hint}</p>
        <dl className="mt-6 grid gap-3 sm:grid-cols-2">
          <div className="rounded-[12px] border border-ink/10 bg-paper/80 px-4 py-3">
            <dt className="text-xs font-medium uppercase tracking-wide text-clay">Banco</dt>
            <dd className="mt-1 font-semibold text-ink">{card.bank}</dd>
          </div>
          <div className="rounded-[12px] border border-ink/10 bg-paper/80 px-4 py-3">
            <dt className="text-xs font-medium uppercase tracking-wide text-clay">Titular</dt>
            <dd className="mt-1 font-semibold text-ink">{card.accountName}</dd>
          </div>
          {card.clabe.trim() ? (
            <div className="rounded-[12px] border border-ink/10 bg-paper/80 px-4 py-3">
              <dt className="text-xs font-medium uppercase tracking-wide text-clay">CLABE</dt>
              <dd className="mt-1 font-semibold tabular-nums text-ink">{card.clabe}</dd>
            </div>
          ) : null}
          <div className="rounded-[12px] border border-ink/10 bg-paper/80 px-4 py-3 sm:col-span-2">
            <dt className="text-xs font-medium uppercase tracking-wide text-clay">Tarjeta</dt>
            <dd className="mt-1 font-semibold tabular-nums text-ink">{card.cardNumber}</dd>
          </div>
        </dl>
        <p className="mt-4 text-sm text-clay">{card.hint}</p>
      </Reveal>
    </section>
  );
}
