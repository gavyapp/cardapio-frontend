// Regras do quadro de pedidos: colunas, tempos, atraso, busca e o próximo
// passo de cada pedido. Sem acesso a banco; vale no servidor e no navegador.
import type { Enums } from "@/lib/database.types";
import {
  formatDuration,
  normalizeSearch,
} from "@/lib/format";

import type { OrderStatus } from "./status";

/** Pedido como o quadro mostra. */
export type BoardOrder = {
  id: string;
  number: number;
  customerName: string;
  customerPhone: string;
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
  title: string;
  /** Rótulo curto da aba no celular. */
  tab: string;
  statuses: readonly OrderStatus[];
  /** Texto antes da média de tempo na etapa. */
  averageLabel: string;
  emptyTitle: string;
  emptyText: string;
};

export const BOARD_COLUMNS: readonly BoardColumn[] = [
  {
    id: "new",
    title: "Novos",
    tab: "Novos",
    statuses: ["RECEBIDO"],
    averageLabel: "Espera média",
    emptyTitle: "Nenhum pedido novo",
    emptyText:
      "Pedidos que chegarem aparecem aqui, com aviso sonoro.",
  },
  {
    id: "preparing",
    title: "Em preparo",
    tab: "Em preparo",
    statuses: ["EM_PREPARO"],
    averageLabel: "Média na etapa",
    emptyTitle: "Nada em preparo",
    emptyText: "Pedidos aceitos aparecem aqui.",
  },
  {
    id: "ready",
    title: "Pronto / Em rota",
    tab: "Pronto/Em rota",
    statuses: ["PRONTO", "A_CAMINHO"],
    averageLabel: "Média na etapa",
    emptyTitle: "Nada pronto ou em rota",
    emptyText:
      "Pedidos prontos para retirada e saídos para entrega aparecem aqui.",
  },
];

/** Atraso e som quando a loja ainda não ajustou nada. */
export const DEFAULT_ORDER_ALERTS = {
  lateAfterMinutes: 30,
  sound: true,
};

export type OrderAlerts = typeof DEFAULT_ORDER_ALERTS;

/** Minutos inteiros entre a data e agora (nunca negativo). */
function minutesSince(
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

/** "Espera média 4min", ou null sem pedidos. */
export function columnAverage(
  column: BoardColumn,
  orders: readonly BoardOrder[],
  now: number,
): string | null {
  if (orders.length === 0) return null;
  const total = orders.reduce(
    (sum, order) =>
      sum + minutesSince(order.stageStartedAt, now),
    0,
  );
  return `${column.averageLabel} ${formatDuration(Math.round(total / orders.length))}`;
}

/** Tempo desde o pedido no card: "agora", "7min" ou "1h 50min". */
export function elapsedLabel(
  order: BoardOrder,
  now: number,
): string {
  const minutes = minutesSince(order.createdAt, now);
  return minutes < 1 ? "agora" : formatDuration(minutes);
}

/** Busca por nome do cliente, número do pedido ou telefone. */
export function matchesOrderSearch(
  order: BoardOrder,
  query: string,
): boolean {
  const text = normalizeSearch(query);
  if (!text) return true;
  if (normalizeSearch(order.customerName).includes(text))
    return true;
  const digits = text.replace(/\D/g, "");
  return (
    digits.length > 0 &&
    (String(order.number).includes(digits) ||
      order.customerPhone
        .replace(/\D/g, "")
        .includes(digits))
  );
}

/**
 * Pedidos de cada coluna. Novos vão do mais antigo ao mais novo; nas outras,
 * os atrasados vêm primeiro.
 */
export function groupByColumn(
  orders: readonly BoardOrder[],
  lateAfterMinutes: number,
  now: number,
): Record<BoardColumnId, BoardOrder[]> {
  const byAge = [...orders].sort((a, b) =>
    a.createdAt.localeCompare(b.createdAt),
  );
  const lateFirst = [...byAge].sort(
    (a, b) =>
      Number(isLate(b, lateAfterMinutes, now)) -
      Number(isLate(a, lateAfterMinutes, now)),
  );
  const inColumn = (
    list: BoardOrder[],
    column: BoardColumnId,
  ) =>
    list.filter((order) =>
      BOARD_COLUMNS.find(
        (c) => c.id === column,
      )!.statuses.includes(order.status),
    );

  return {
    new: inColumn(byAge, "new"),
    preparing: inColumn(lateFirst, "preparing"),
    ready: inColumn(lateFirst, "ready"),
  };
}

/** Quantos pedidos esperam ser aceitos. */
export function countNewOrders(
  orders: readonly BoardOrder[],
): number {
  return orders.filter(
    (order) => order.status === "RECEBIDO",
  ).length;
}

type NextStep = {
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
        : { status: "PRONTO", label: "Pronto" };
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
  const duration = formatDuration(
    minutesSince(order.stageStartedAt, now),
  );
  switch (order.status) {
    case "EM_PREPARO":
      return `Aceito há ${duration}`;
    case "PRONTO":
      return `Pronto há ${duration}`;
    case "A_CAMINHO":
      return `Saiu há ${duration}`;
    default:
      return null;
  }
}

/** Cor da faixa à esquerda do card. */
export type OrderTone =
  "late" | "new" | "preparing" | "ready" | "out";

export function orderTone(
  order: BoardOrder,
  lateAfterMinutes: number,
  now: number,
): OrderTone {
  if (isLate(order, lateAfterMinutes, now)) return "late";
  switch (order.status) {
    case "RECEBIDO":
      return "new";
    case "EM_PREPARO":
      return "preparing";
    case "PRONTO":
      return "ready";
    default:
      return "out";
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

/** Fuso das lojas; o "hoje" do título começa à meia-noite daqui. */
const STORE_UTC_OFFSET = "-03:00";

/**
 * Início do dia de hoje no horário de Brasília, em ISO. O Brasil não tem
 * horário de verão desde 2019, então o deslocamento é fixo.
 */
export function startOfStoreDay(now: number): string {
  const day = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
  }).format(now);
  return `${day}T00:00:00${STORE_UTC_OFFSET}`;
}

/** Parâmetros da URL do quadro. */
export const ORDER_SEARCH_PARAM = "busca";
export const ORDER_PARAM = "pedido";
