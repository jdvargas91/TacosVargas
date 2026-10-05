import { formatMxn } from "@/lib/format";

export type WhatsAppOrderItem = {
  name: string;
  qty: number;
  unitPriceCents: number;
  tortillas?: 1 | 2;
};

export type WhatsAppOrder = {
  folio: string;
  name: string;
  phone: string;
  items: WhatsAppOrderItem[];
  totalCents: number;
  notes?: string;
};

function money(cents: number) {
  return formatMxn(cents);
}

export function buildOrderMessage(order: WhatsAppOrder) {
  const lines = [
    `Hola, soy ${order.name}.`,
    `Pedido Vargas Tacos · ${order.folio}`,
    "",
    ...order.items.map((item) => {
      const tort =
        item.tortillas === 1 ? " · 1 tortilla" : item.tortillas === 2 ? " · 2 tortillas" : "";
      return `• ${item.qty}× ${item.name}${tort} (${money(item.unitPriceCents * item.qty)})`;
    }),
    "",
    `Total: ${money(order.totalCents)}`,
    "Entrega: recoger en el local",
    `Teléfono: ${order.phone}`,
    "Pago: transferencia (comprobante subido)",
  ];
  if (order.notes?.trim()) {
    lines.push(`Notas: ${order.notes.trim()}`);
  }
  return lines.join("\n");
}

export function whatsappUrl(text: string, phone: string) {
  return `https://wa.me/${phone}?text=${encodeURIComponent(text)}`;
}

export function whatsappCustomerUrl(phone: string) {
  const digits = phone.replace(/\D/g, "");
  const intl = digits.startsWith("52") ? digits : `52${digits}`;
  return `https://wa.me/${intl}`;
}
