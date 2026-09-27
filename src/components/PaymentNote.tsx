import { Reveal } from "@/components/Reveal";
import { useSiteContent } from "@/context/SiteContentContext";

export function PaymentNote() {
  const { business } = useSiteContent();

  return (
    <section id="pago" className="px-4 py-16 md:px-6">
      <Reveal className="card-shadow mx-auto max-w-6xl rounded-2xl bg-smoke px-6 py-10 md:px-12">
        <h2 className="font-display text-4xl leading-[1.05] text-ink">Pagas en persona</h2>
        <span className="mark" aria-hidden />
        <p className="mt-4 max-w-[65ch] text-clay">{business.payment}</p>
      </Reveal>
    </section>
  );
}
