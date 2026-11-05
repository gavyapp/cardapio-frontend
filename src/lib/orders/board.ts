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
  /** Alguém da loja já abriu o pedido (vale para todos os aparelhos). */
  isSeen: boolean;
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
  order: Pick<BoardOrder, "createdAt">,
  lateAfterMinutes: number,
  now: number,
): boolean {
  return (
    minutesSince(order.createdAt, now) >= lateAfterMinutes
  );
}

/** Mudanças de status de um pedido, para as médias das colunas. */
export type StageHistory = {
  createdAt: string;
  /** Em qualquer ordem; o "recebido" vem da hora do pedido. */
  events: { status: OrderStatus; at: string }[];
};

/** Ordem do fluxo, para desempatar mudanças gravadas no mesmo instante. */
const STATUS_FLOW: readonly OrderStatus[] = [
  "RECEBIDO",
  "EM_PREPARO",
  "PRONTO",
  "A_CAMINHO",
  "CONCLUIDO",
  "REJEITADO",
  "CANCELADO",
];

type ColumnPassage = {
  column: BoardColumnId;
  start: number;
  /** null enquanto o pedido ainda está na coluna. */
  end: number | null;
};

function columnOf(
  status: OrderStatus,
): BoardColumnId | null {
  return (
    BOARD_COLUMNS.find((column) =>
      column.statuses.includes(status),
    )?.id ?? null
  );
}

/**
 * Passagens do pedido pelas colunas. Pronto e saiu para entrega ficam na
 * mesma coluna, então contam como uma passagem só.
 */
function columnPassages(
  history: StageHistory,
): ColumnPassage[] {
  const steps = [
    {
      status: "RECEBIDO" as OrderStatus,
      at: history.createdAt,
    },
    ...history.events
      .filter((event) => event.status !== "RECEBIDO")
      .sort(
        (a, b) =>
          a.at.localeCompare(b.at) ||
          STATUS_FLOW.indexOf(a.status) -
            STATUS_FLOW.indexOf(b.status),
      ),
  ];
  const passages: ColumnPassage[] = [];
  for (const step of steps) {
    const at = new Date(step.at).getTime();
    const column = columnOf(step.status);
    const current = passages[passages.length - 1];
    if (current && current.end === null) {
      if (current.column === column) continue;
      current.end = at;
    }
    if (column)
      passages.push({ column, start: at, end: null });
  }
  return passages;
}

/**
 * "Média na etapa 18min": tempo médio dos pedidos do dia na coluna. Quem já
 * saiu dela conta o tempo que ficou; quem ainda está conta o tempo até
 * agora, para um pedido parado já puxar a média. Null se a etapa não teve
 * pedidos hoje.
 */
export function columnAverage(
  column: BoardColumn,
  history: readonly StageHistory[],
  now: number,
): string | null {
  const dayStart = new Date(startOfStoreDay(now)).getTime();
  const durations = history
    .flatMap(columnPassages)
    .filter(
      (passage) =>
        passage.column === column.id &&
        (passage.start >= dayStart || passage.end === null),
    )
    .map((passage) =>
      Math.max(0, (passage.end ?? now) - passage.start),
    );
  if (durations.length === 0) return null;
  const average =
    durations.reduce((sum, ms) => sum + ms, 0) /
    durations.length;
  return `${column.averageLabel} ${formatDuration(Math.floor(average / 60_000))}`;
}

/** Tempo desde o pedido no card: "agora", "7min" ou "1h 50min". */
export function elapsedLabel(
  order: Pick<BoardOrder, "createdAt">,
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

/**
 * Pedido novo que ninguém da loja abriu ainda. É o que faz o alarme tocar
 * e o que ganha o selo "Novo" no quadro.
 */
export function isUnseen(
  order: Pick<BoardOrder, "status" | "isSeen">,
): boolean {
  return order.status === "RECEBIDO" && !order.isSeen;
}

/** Quantos pedidos novos ninguém abriu ainda. */
export function countUnseenOrders(
  orders: readonly BoardOrder[],
): number {
  return orders.filter(isUnseen).length;
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
