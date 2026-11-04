// Regras do quadro de pedidos: colunas, tempos, atraso, busca e o próximo
// passo de cada pedido. Sem acesso a banco; vale no servidor e no navegador.
import type { Enums } from "@/lib/database.types";
import { normalizeSearch } from "@/lib/format";

import type { OrderStatus } from "./status";

/** Pedido como o quadro mostra. */
export type BoardOrder = {
  id: string;
  number: number;
  customerName: string;
  mode: Enums<"order_mode">;
  paymentMethod: Enums<"payment_method">;
  total: number;
  isPaid: boolean;
  status: OrderStatus;
  createdAt: string;
  /** Quando o pedido entrou no status atual. */
  stageStartedAt: string;
  itemCount: number;
};

/** Status que aparecem no quadro; os demais saem dele. */
export const OPEN_ORDER_STATUSES = [
  "RECEBIDO",
  "EM_PREPARO",
  "PRONTO",
  "A_CAMINHO",
] as const satisfies readonly OrderStatus[];

export type BoardColumnId = "new" | "preparing" | "ready";

export type BoardColumn = {
  id: BoardColumnId;
  label: string;
  statuses: readonly OrderStatus[];
  /** Texto antes da média de tempo na etapa. */
  averageLabel: string;
};

export const BOARD_COLUMNS: readonly BoardColumn[] = [
  {
    id: "new",
    label: "Novos",
    statuses: ["RECEBIDO"],
    averageLabel: "Espera média",
  },
  {
    id: "preparing",
    label: "Em preparo",
    statuses: ["EM_PREPARO"],
    averageLabel: "Média na etapa",
  },
  {
    id: "ready",
    label: "Prontos",
    statuses: ["PRONTO", "A_CAMINHO"],
    averageLabel: "Média na etapa",
  },
];

/** Atraso e som quando a loja ainda não ajustou nada. */
export const DEFAULT_ORDER_ALERTS = {
  lateAfterMinutes: 30,
  sound: true,
};

export type OrderAlerts = typeof DEFAULT_ORDER_ALERTS;

/** Minutos inteiros entre a data e agora (nunca negativo). */
export function minutesSince(
  isoDate: string,
  now: number,
): number {
  const elapsed = now - new Date(isoDate).getTime();
  return Math.max(0, Math.floor(elapsed / 60_000));
}

/** Pedido aberto há mais tempo que o limite da loja. */
export function isLate(
  order: BoardOrder,
  lateAfterMinutes: number,
  now: number,
): boolean {
  return (
    minutesSince(order.createdAt, now) >= lateAfterMinutes
  );
}

/** Tempo médio na etapa dos pedidos da coluna, ou null sem pedidos. */
export function averageMinutesInStage(
  orders: readonly BoardOrder[],
  now: number,
): number | null {
  if (orders.length === 0) return null;
  const total = orders.reduce(
    (sum, order) =>
      sum + minutesSince(order.stageStartedAt, now),
    0,
  );
  return Math.round(total / orders.length);
}

/** "7 min"; a partir de uma hora, "1 h 05". */
export function formatMinutes(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const rest = String(minutes % 60).padStart(2, "0");
  return `${hours} h ${rest}`;
}

/** Busca por número ("12", "#12") ou nome do cliente. */
export function matchesOrderSearch(
  order: BoardOrder,
  query: string,
): boolean {
  const text = normalizeSearch(query).replace(/^#/, "");
  if (!text) return true;
  if (/^\d+$/.test(text)) {
    return String(order.number).startsWith(text);
  }
  return normalizeSearch(order.customerName).includes(text);
}

/** Pedidos de cada coluna, do mais antigo para o mais novo. */
export function groupByColumn(
  orders: readonly BoardOrder[],
): Record<BoardColumnId, BoardOrder[]> {
  const groups: Record<BoardColumnId, BoardOrder[]> = {
    new: [],
    preparing: [],
    ready: [],
  };
  for (const column of BOARD_COLUMNS) {
    groups[column.id] = orders
      .filter((order) =>
        column.statuses.includes(order.status),
      )
      .sort((a, b) =>
        a.createdAt.localeCompare(b.createdAt),
      );
  }
  return groups;
}

/** Quantos pedidos esperam ser aceitos. */
export function countNewOrders(
  orders: readonly BoardOrder[],
): number {
  return orders.filter(
    (order) => order.status === "RECEBIDO",
  ).length;
}

export type NextStep = {
  status: OrderStatus;
  label: string;
};

/**
 * Botão principal do card: o passo seguinte do fluxo. Entrega sai do preparo
 * direto para "saiu para entrega"; retirada passa por "pronto".
 */
export function nextStep(
  order: Pick<BoardOrder, "status" | "mode">,
): NextStep | null {
  const delivery = order.mode === "ENTREGA";
  switch (order.status) {
    case "RECEBIDO":
      return { status: "EM_PREPARO", label: "Aceitar" };
    case "EM_PREPARO":
      return delivery
        ? {
            status: "A_CAMINHO",
            label: "Saiu para entrega",
          }
        : {
            status: "PRONTO",
            label: "Pronto para retirada",
          };
    case "PRONTO":
      return delivery
        ? {
            status: "A_CAMINHO",
            label: "Saiu para entrega",
          }
        : { status: "CONCLUIDO", label: "Retirado" };
    case "A_CAMINHO":
      return { status: "CONCLUIDO", label: "Entregue" };
    default:
      return null;
  }
}

/** Linha de apoio do card: há quanto tempo está na etapa. */
export function stageCaption(
  order: BoardOrder,
  now: number,
): string | null {
  const minutes = formatMinutes(
    minutesSince(order.stageStartedAt, now),
  );
  switch (order.status) {
    case "EM_PREPARO":
      return `Aceito há ${minutes}`;
    case "PRONTO":
      return `Pronto há ${minutes}`;
    case "A_CAMINHO":
      return `Saiu há ${minutes}`;
    default:
      return null;
  }
}

export const MODE_LABELS: Record<
  Enums<"order_mode">,
  string
> = {
  ENTREGA: "Entrega",
  RETIRADA: "Retirada",
};

export const PAYMENT_LABELS: Record<
  Enums<"payment_method">,
  string
> = {
  DINHEIRO: "Dinheiro",
  CARTAO: "Cartão",
  PIX: "Pix",
};

/** Parâmetros da URL do quadro. */
export const ORDER_SEARCH_PARAM = "busca";
export const ORDER_PARAM = "pedido";
