import { LegalLayout, LegalSection } from "@/components/LegalLayout";
import { useConsent } from "@/context/ConsentContext";
import { useSiteContent } from "@/context/SiteContentContext";

export function Privacidad() {
  const { business } = useSiteContent();
  const { openSettings } = useConsent();

  return (
    <LegalLayout
      title="Política de privacidad"
      description={`Aviso de privacidad de ${business.name}: qué datos usa el pedido, la cuenta de Google y las cookies.`}
    >
      <LegalSection title="Responsable">
        <p>
          {business.name} ({business.legalName}) es responsable de los datos que dejas al pedir. El domicilio es{" "}
          {business.location.label} El contacto es el WhatsApp {business.phone}.
        </p>
      </LegalSection>

      <LegalSection title="Qué datos usamos">
        <ul className="list-disc space-y-2 pl-5">
          <li>El nombre que escribes en el pedido y las notas, si dejas alguna.</li>
          <li>El correo y el nombre de tu cuenta de Google, cuando entras para confirmar.</li>
          <li>El detalle de la orden: productos, cantidades, total y forma de pago.</li>
          <li>La captura del comprobante, solo si pagas por adelantado.</li>
          <li>El carrito y la sesión, guardados en este navegador para no perder el pedido.</li>
        </ul>
        <p>No pedimos tarjeta para cobrar en línea. El pago por adelantado es una transferencia que tú haces.</p>
      </LegalSection>

      <LegalSection title="Para qué">
        <p>
          Usamos esos datos para preparar tu pedido, identificarte cuando lo recoges, mostrarte tus órdenes y, si pagaste
          por adelantado, revisar el comprobante. El equipo del local ve los pedidos en el panel. No vendemos tus datos
          ni los usamos para publicidad de terceros.
        </p>
      </LegalSection>

      <LegalSection title="Quién más los trata">
        <ul className="list-disc space-y-2 pl-5">
          <li>Supabase guarda la cuenta, los pedidos y el comprobante.</li>
          <li>Google valida el inicio de sesión y nos entrega el nombre y el correo de esa cuenta.</li>
          <li>
            Google Fonts entrega la tipografía del sitio. El navegador pide esos archivos a Google para mostrar la
            página.
          </li>
          <li>
            OpenStreetMap entrega las imágenes del mapa de ubicación, y solo si aceptas esa cookie. Si no la aceptas, la
            dirección y el enlace a Google Maps siguen visibles.
          </li>
        </ul>
      </LegalSection>

      <LegalSection title="Cookies y almacenamiento">
        <p>Hay dos grupos:</p>
        <ul className="list-disc space-y-2 pl-5">
          <li>
            Necesarias. El carrito del pedido, la sesión de tu cuenta, el pedido que estás por confirmar y la cookie{" "}
            <span className="font-medium text-ink">tv_consent</span>, que recuerda si aceptaste el mapa. Dura unos seis
            meses. Estas no se apagan, porque sin ellas el pedido no se sostiene.
          </li>
          <li>
            Mapa. Si la aceptas, la sección de ubicación carga el mapa de OpenStreetMap. Si la rechazas, esa petición no
            se hace.
          </li>
        </ul>
        <p>
          <button type="button" onClick={openSettings} className="cursor-pointer font-medium text-ember hover:underline">
            Cambiar mi elección de cookies
          </button>
        </p>
      </LegalSection>

      <LegalSection title="Cuánto tiempo los guardamos">
        <p>
          El carrito vive en tu navegador hasta que vacías el pedido, confirmas o borras los datos del sitio. La cuenta y
          las órdenes se conservan mientras uses el servicio y el tiempo necesario para atender el pedido. Puedes pedir
          que borremos tu cuenta y tus órdenes.
        </p>
      </LegalSection>

      <LegalSection title="Tus derechos">
        <p>
          Puedes pedir acceso, corrección, cancelación u oposición al uso de tus datos, y revocar el consentimiento del
          mapa desde el aviso de cookies. Escribe por WhatsApp al {business.phone} e indica tu nombre y el correo de la
          cuenta. Respondemos por ese mismo medio.
        </p>
      </LegalSection>

      <LegalSection title="Cambios a este aviso">
        <p>
          Si cambia la forma en que usamos los datos, actualizamos esta página y la fecha de arriba. El aviso vigente es
          el que está publicado aquí.
        </p>
      </LegalSection>
    </LegalLayout>
  );
}
