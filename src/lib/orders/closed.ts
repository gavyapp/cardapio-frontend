// Regras da lista de pedidos encerrados do dia (concluídos, recusados e
// cancelados), embaixo do quadro: conferência, filtros e páginas. Sem
// acesso a banco; vale no servidor e no navegador.
import type { BoardOrder } from "./board";

/** Linha da lista de encerrados. */
export type ClosedOrder = Pick<
  BoardOrder,
  | "id"
  | "number"
  | "customerName"
  | "customerPhone"
  | "mode"
  | "paymentMethod"
  | "total"
  | "isPaid"
  | "createdAt"
> & {
  status: "CONCLUIDO" | "REJEITADO" | "CANCELADO";
};

export type ClosedFilter =
  "concluidos" | "cancelados" | "nao-pagos";

/** Parâmetros da URL da lista. */
export const CLOSED_FILTER_PARAM = "encerrados";
export const CLOSED_PAGE_PARAM = "pagina";
export const CLOSED_SEARCH_PARAM = "busca-encerrados";

export const CLOSED_PAGE_SIZE = 20;

export function isCompleted(order: ClosedOrder): boolean {
  return order.status === "CONCLUIDO";
}

/** Concluído sem pagamento marcado: o que falta acertar no caixa. */
export function isUnpaid(order: ClosedOrder): boolean {
  return isCompleted(order) && !order.isPaid;
}

const FILTERS: Record<
  ClosedFilter,
  {
    label: string;
    matches: (order: ClosedOrder) => boolean;
  }
> = {
  concluidos: { label: "Concluídos", matches: isCompleted },
  cancelados: {
    label: "Cancelados",
    matches: (order) => !isCompleted(order),
  },
  "nao-pagos": { label: "Não pagos", matches: isUnpaid },
};

export const CLOSED_FILTERS = Object.entries(FILTERS).map(
  ([id, filter]) => ({ id: id as ClosedFilter, ...filter }),
);

export function parseClosedFilter(
  value: string | null,
): ClosedFilter | null {
  return value !== null && value in FILTERS
    ? (value as ClosedFilter)
    : null;
}

export function applyClosedFilter(
  orders: readonly ClosedOrder[],
  filter: ClosedFilter | null,
): ClosedOrder[] {
  return filter
    ? orders.filter(FILTERS[filter].matches)
    : [...orders];
}

/** Conferência do dia: quantos de cada filtro e a soma dos concluídos. */
export function summarizeClosed(
  orders: readonly ClosedOrder[],
): {
  counts: Record<ClosedFilter, number>;
  completedTotal: number;
} {
  const counts = {
    concluidos: 0,
    cancelados: 0,
    "nao-pagos": 0,
  };
  let completedTotal = 0;
  for (const order of orders) {
    for (const { id, matches } of CLOSED_FILTERS)
      if (matches(order)) counts[id] += 1;
    if (isCompleted(order)) completedTotal += order.total;
  }
  return { counts, completedTotal };
}

/** Status da linha; recusado e cancelado ficam separados. */
export const CLOSED_STATUS_LABELS: Record<
  ClosedOrder["status"],
  string
> = {
  CONCLUIDO: "Concluído",
  REJEITADO: "Recusado",
  CANCELADO: "Cancelado",
};
