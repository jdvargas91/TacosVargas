import { LegalLayout, LegalSection } from "@/components/LegalLayout";
import { useSiteContent } from "@/context/SiteContentContext";

export function Terminos() {
  const { business } = useSiteContent();

  return (
    <LegalLayout
      title="Términos y condiciones"
      description={`Condiciones para pedir y recoger en ${business.name}, en ${business.location.city}.`}
    >
      <LegalSection title="Quién ofrece el servicio">
        <p>
          {business.name} ({business.legalName}) atiende en {business.location.label} El horario de servicio es{" "}
          {business.hours.days.toLowerCase()}, {business.hours.label} El pedido se recoge en el local. No hay envío a
          domicilio.
        </p>
      </LegalSection>

      <LegalSection title="Cómo se arma un pedido">
        <p>
          El menú muestra tacos, aguas y refrescos con su precio en pesos mexicanos. Tú eliges productos y cantidades.
          El pedido queda en este navegador hasta que lo confirmas o lo vacías.
        </p>
        <p>
          Para confirmar hace falta entrar con Google. La cuenta guarda tu perfil y el historial de órdenes. Sin esa
          entrada el pedido no se registra.
        </p>
      </LegalSection>

      <LegalSection title="Pago">
        <p>Hay dos formas de pagar:</p>
        <ul className="list-disc space-y-2 pl-5">
          <li>Pago en el local: pagas cuando recoges. No hace falta comprobante para que el pedido llegue al panel.</li>
          <li>
            Pago por adelantado: transfieres el total y subes la captura. Sin ese comprobante el pedido no llega al
            panel.
          </li>
        </ul>
        <p>
          El total que ves al confirmar es el que corresponde a ese pedido. Los precios del menú pueden cambiar, y un
          producto puede agotarse antes de que lo recojas. Si ya no hay existencia, el local te lo dice al entregar.
        </p>
      </LegalSection>

      <LegalSection title="Horario">
        <p>
          Los pedidos se preparan en el horario de servicio. Si armas el pedido cuando el local está cerrado, se atiende
          en el siguiente turno: {business.hours.days.toLowerCase()}, {business.hours.label}
        </p>
      </LegalSection>

      <LegalSection title="Uso del sitio">
        <p>
          El sitio sirve para ver el menú, armar el pedido y consultar tus órdenes. No uses la cuenta de otra persona ni
          subas un comprobante que no corresponda a tu pago. Podemos rechazar un pedido si falta el comprobante en el
          pago por adelantado, si el producto se agotó o si el local no puede prepararlo.
        </p>
      </LegalSection>

      <LegalSection title="Cambios">
        <p>
          Estas condiciones pueden actualizarse. La fecha de arriba indica la versión vigente. Seguir usando el sitio
          después de un cambio implica que aceptas la versión nueva.
        </p>
      </LegalSection>

      <LegalSection title="Contacto">
        <p>
          Para una duda del pedido escribe por WhatsApp al {business.phone}, o pregunta en el local:{" "}
          {business.location.street}, {business.location.city}.
        </p>
      </LegalSection>
    </LegalLayout>
  );
}
