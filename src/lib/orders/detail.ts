// Regras do detalhe do pedido no painel: linha do tempo, troco, endereço,
// ações de cada status e mensagens de WhatsApp. Sem acesso a banco; vale no
// servidor e no navegador.
import type { Enums } from "@/lib/database.types";
import {
  formatCurrency,
  formatStoreTime,
} from "@/lib/format";

import type { BoardOrder } from "./board";
import type { OrderStatus } from "./status";

/** O que as ações de um pedido precisam, venha do card ou do detalhe. */
export type OrderRef = Pick<
  BoardOrder,
  | "id"
  | "number"
  | "status"
  | "mode"
  | "isPaid"
  | "customerName"
  | "total"
>;

/** Disponibilidade de um item do cardápio (null se foi excluído). */
export type MenuAvailability = {
  id: string;
  isAvailable: boolean;
} | null;

export type OrderDetailComplement = {
  id: string;
  groupName: string;
  name: string;
  quantity: number;
  menuItem: MenuAvailability;
};

export type OrderDetailItem = {
  id: string;
  name: string;
  quantity: number;
  total: number;
  notes: string | null;
  menuItem: MenuAvailability;
  complements: OrderDetailComplement[];
};

export type OrderDetailEvent = {
  toStatus: OrderStatus;
  note: string | null;
  createdAt: string;
};

export type OrderAddress = {
  street: string | null;
  number: string | null;
  district: string | null;
  city: string | null;
  complement: string | null;
  reference: string | null;
};

/** Pedido completo, como o detalhe mostra. */
export type OrderDetail = {
  id: string;
  number: number;
  status: OrderStatus;
  mode: Enums<"order_mode">;
  customerName: string;
  customerPhone: string;
  address: OrderAddress | null;
  paymentMethod: Enums<"payment_method">;
  changeFor: number | null;
  subtotal: number;
  deliveryFee: number;
  discount: number;
  total: number;
  notes: string | null;
  isPaid: boolean;
  rejectionReason: string | null;
  readAt: string | null;
  createdAt: string;
  items: OrderDetailItem[];
  events: OrderDetailEvent[];
};

export const CLOSED_ORDER_STATUSES = [
  "CONCLUIDO",
  "REJEITADO",
  "CANCELADO",
] as const satisfies readonly OrderStatus[];

export function isClosed(status: OrderStatus): boolean {
  return (
    CLOSED_ORDER_STATUSES as readonly OrderStatus[]
  ).includes(status);
}

type ModeAndStatus = {
  status: OrderStatus;
  mode: Enums<"order_mode">;
};

/** Selo da etapa no cabeçalho do detalhe. */
export function statusBadge({
  status,
  mode,
}: ModeAndStatus): string {
  switch (status) {
    case "RECEBIDO":
      return "Aguardando aceite";
    case "EM_PREPARO":
      return "Em preparo";
    case "PRONTO":
      return mode === "RETIRADA"
        ? "Pronto para retirada"
        : "Pronto";
    case "A_CAMINHO":
      return "Saiu para entrega";
    case "CONCLUIDO":
      return mode === "RETIRADA" ? "Retirado" : "Entregue";
    case "REJEITADO":
      return "Recusado";
    case "CANCELADO":
      return "Cancelado";
  }
}

/**
 * Texto do botão principal no rodapé do detalhe, mais descritivo que o do
 * card (o status de destino é o mesmo do `nextStep` do quadro).
 */
export function detailStepLabel({
  status,
  mode,
}: ModeAndStatus): string | null {
  const delivery = mode === "ENTREGA";
  switch (status) {
    case "RECEBIDO":
      return "Aceitar pedido";
    case "EM_PREPARO":
      return delivery
        ? "Saiu para entrega"
        : "Marcar como pronto";
    case "PRONTO":
      return delivery
        ? "Saiu para entrega"
        : "Retirado · concluir";
    case "A_CAMINHO":
      return "Entregue · concluir";
    default:
      return null;
  }
}

/** Recusar (pedido novo) ou cancelar (já aceito); null se já fechou. */
export function closingKind(
  status: OrderStatus,
): "reject" | "cancel" | null {
  if (status === "RECEBIDO") return "reject";
  if (isClosed(status)) return null;
  return "cancel";
}

export type TimelineStep = {
  label: string;
  /** "19:42", ou null para passo que ainda não aconteceu. */
  time: string | null;
  state: "done" | "current" | "next";
  /** Recusa ou cancelamento (fica em vermelho, com o motivo). */
  stopped?: boolean;
  note?: string | null;
};

const STEP_LABELS: Record<OrderStatus, string> = {
  RECEBIDO: "Pedido recebido",
  EM_PREPARO: "Aceito · em preparo",
  PRONTO: "Pronto para retirada",
  A_CAMINHO: "Saiu para entrega",
  CONCLUIDO: "Concluído",
  REJEITADO: "Recusado",
  CANCELADO: "Cancelado",
};

/**
 * Passos do fluxo com a hora de cada um. Entrega passa por "pronto" só se
 * a loja usou esse passo. Recusado e cancelado encerram a linha, sem os
 * passos que não chegaram a acontecer.
 */
export function timelineSteps(
  order: Pick<
    OrderDetail,
    | "status"
    | "mode"
    | "createdAt"
    | "events"
    | "rejectionReason"
  >,
): TimelineStep[] {
  const delivery = order.mode === "ENTREGA";
  const reachedAt = (status: OrderStatus) =>
    status === "RECEBIDO"
      ? order.createdAt
      : (order.events
          .filter((event) => event.toStatus === status)
          .map((event) => event.createdAt)
          .sort()
          .at(-1) ?? null);

  const flow: OrderStatus[] = ["RECEBIDO", "EM_PREPARO"];
  if (!delivery || reachedAt("PRONTO")) flow.push("PRONTO");
  if (delivery) flow.push("A_CAMINHO");
  flow.push("CONCLUIDO");

  const label = (status: OrderStatus) =>
    status === "CONCLUIDO"
      ? delivery
        ? "Entregue"
        : "Retirado"
      : STEP_LABELS[status];

  if (
    order.status === "REJEITADO" ||
    order.status === "CANCELADO"
  ) {
    const happened = flow.filter(
      (status) => reachedAt(status) !== null,
    );
    const stoppedEvent = order.events
      .filter((event) => event.toStatus === order.status)
      .at(-1);
    return [
      ...happened.map((status): TimelineStep => ({
        label: label(status),
        time: formatStoreTime(reachedAt(status)!),
        state: "done",
      })),
      {
        label: STEP_LABELS[order.status],
        time: stoppedEvent
          ? formatStoreTime(stoppedEvent.createdAt)
          : null,
        state: "current",
        stopped: true,
        note:
          order.rejectionReason ??
          stoppedEvent?.note ??
          null,
      },
    ];
  }

  const current = flow.indexOf(order.status);
  return flow.map((status, index) => {
    const at = index <= current ? reachedAt(status) : null;
    return {
      label: label(status),
      time: at ? formatStoreTime(at) : null,
      state:
        index < current
          ? "done"
          : index === current
            ? "current"
            : "next",
    };
  });
}

/**
 * "Troco para R$ 50,00 · levar R$ 12,10", "Sem troco" no dinheiro sem
 * troco, ou null nas outras formas de pagamento.
 */
export function changeLabel(
  order: Pick<
    OrderDetail,
    "paymentMethod" | "changeFor" | "total"
  >,
): string | null {
  if (order.paymentMethod !== "DINHEIRO") return null;
  if (order.changeFor === null) return "Sem troco";
  const bring = Math.max(0, order.changeFor - order.total);
  return `Troco para ${formatCurrency(order.changeFor)} · levar ${formatCurrency(bring)}`;
}

/** Endereço em duas linhas: rua e número, e o resto (bairro, referência…). */
export function addressLines(
  address: OrderAddress | null,
): { main: string; extra: string } | null {
  if (!address) return null;
  const main = [address.street, address.number]
    .filter(Boolean)
    .join(", ");
  const extra = [
    address.complement,
    address.district,
    address.city,
    address.reference,
  ]
    .filter(Boolean)
    .join(" · ");
  if (!main && !extra) return null;
  return { main: main || extra, extra: main ? extra : "" };
}

/** Lê o endereço gravado no pedido (jsonb sem formato garantido). */
export function parseAddress(
  value: unknown,
): OrderAddress | null {
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  const text = (key: string) => {
    const field = record[key];
    if (typeof field === "number") return String(field);
    return typeof field === "string" && field.trim()
      ? field.trim()
      : null;
  };
  return {
    street: text("street"),
    number: text("number"),
    district: text("district"),
    city: text("city"),
    complement: text("complement"),
    reference: text("reference"),
  };
}

export type WhatsAppAction = {
  label: string;
  href: string;
};

/**
 * Botão de WhatsApp do passo atual, com a mensagem já escrita. Só existe
 * nos passos do fluxo: pedido novo e em preparo (avisar um problema),
 * pronto para retirada e saiu para entrega (avisar o cliente). Pedido
 * fechado não tem.
 */
export function whatsAppAction(
  order: Pick<
    OrderDetail,
    | "status"
    | "mode"
    | "number"
    | "customerName"
    | "customerPhone"
  >,
  storeName: string,
): WhatsAppAction | null {
  const firstName =
    order.customerName.trim().split(/\s+/)[0] ?? "";
  const hello = firstName ? `Olá, ${firstName}!` : "Olá!";
  const number = `#${order.number}`;

  let action: { label: string; text: string } | null;
  switch (order.status) {
    case "RECEBIDO":
    case "EM_PREPARO":
      action = {
        label: "Avisar problema",
        text: `${hello} Aqui é da ${storeName}, sobre o seu pedido ${number}: `,
      };
      break;
    case "PRONTO":
      action =
        order.mode === "RETIRADA"
          ? {
              label: "Avisar que está pronto",
              text: `${hello} Seu pedido ${number} da ${storeName} está pronto para retirada.`,
            }
          : {
              label: "Avisar problema",
              text: `${hello} Aqui é da ${storeName}, sobre o seu pedido ${number}: `,
            };
      break;
    case "A_CAMINHO":
      action = {
        label: "Avisar que saiu",
        text: `${hello} Seu pedido ${number} da ${storeName} saiu para entrega e já está a caminho.`,
      };
      break;
    default:
      action = null;
  }
  if (!action) return null;

  const phone = whatsAppNumber(order.customerPhone);
  if (!phone) return null;
  return {
    label: action.label,
    href: `https://wa.me/${phone}?text=${encodeURIComponent(action.text)}`,
  };
}

/** Telefone no formato do wa.me: só dígitos, com o 55 do Brasil. */
export function whatsAppNumber(
  phone: string,
): string | null {
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 10 || digits.length === 11)
    return `55${digits}`;
  if (
    (digits.length === 12 || digits.length === 13) &&
    digits.startsWith("55")
  )
    return digits;
  return null;
}
