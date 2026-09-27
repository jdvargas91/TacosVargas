import { formatMxn } from "@/lib/format";

export type WhatsAppOrderItem = {
  name: string;
  qty: number;
  unitPriceCents: number;
};

export type WhatsAppOrder = {
  folio: string;
  name: string;
  phone: string;
  fulfillment: "pickup" | "delivery";
  address: string;
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
    `Pedido Vargas Tacos · folio ${order.folio}`,
    "",
    ...order.items.map(
      (item) =>
        `• ${item.qty}× ${item.name} (${money(item.unitPriceCents * item.qty)})`,
    ),
    "",
    `Total: ${money(order.totalCents)}`,
    order.fulfillment === "pickup"
      ? "Entrega: recoger en el local"
      : `Entrega: mensajería (costo extra por confirmar)\nDirección: ${order.address}`,
    `Teléfono: ${order.phone}`,
    "Pago: presencial",
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
