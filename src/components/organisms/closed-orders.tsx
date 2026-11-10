"use client";

import { Badge } from "@/components/atoms/badge";
import { Button } from "@/components/atoms/button";
import { Check } from "lucide-react";
import { useEffect, useRef } from "react";

import { OrderModeIcon } from "@/components/atoms/order-mode-icon";
import { Pagination } from "@/components/molecules/pagination";
import { SearchParamInput } from "@/components/molecules/search-param-input";
import { useLiveOrdersContext } from "@/components/providers/live-orders-provider";
import {
  formatCurrency,
  formatStoreTime,
} from "@/lib/format";
import { useClosedOrders } from "@/lib/hooks/use-closed-orders";
import {
  setSearchParams,
  useSearchParamState,
} from "@/lib/hooks/use-search-param-state";
import {
  MODE_LABELS,
  ORDER_PARAM,
  PAYMENT_LABELS,
  matchesOrderSearch,
} from "@/lib/orders/board";
import {
  CLOSED_FILTERS,
  CLOSED_FILTER_PARAM,
  CLOSED_PAGE_PARAM,
  CLOSED_PAGE_SIZE,
  CLOSED_SEARCH_PARAM,
  CLOSED_STATUS_LABELS,
  applyClosedFilter,
  isCompleted,
  isUnpaid,
  parseClosedFilter,
  summarizeClosed,
  type ClosedFilter,
  type ClosedOrder,
} from "@/lib/orders/closed";
import { paginate } from "@/lib/panel/pagination";
import { cn } from "@/lib/utils";

/** Nº · Hora · Cliente · Modo · Pagamento · Status · Total; no celular, Nº · Hora · Cliente · Total. */
const COLUMNS =
  "grid grid-cols-[48px_48px_minmax(0,1fr)_84px] gap-4 lg:grid-cols-[70px_70px_minmax(0,1fr)_110px_150px_110px_110px]";

/**
 * Pedidos de hoje que já saíram do quadro, embaixo dele, como no protótipo.
 * Além do protótipo: conferência do dia que filtra a lista, pagamento na
 * linha, páginas e a linha abre o detalhe do pedido (?pedido=N). Relê
 * sozinha quando a lista ao vivo do painel muda.
 */
export function ClosedOrders() {
  const live = useLiveOrdersContext();
  const [search] = useSearchParamState(CLOSED_SEARCH_PARAM);
  const [selected] = useSearchParamState(ORDER_PARAM);
  const [filterParam] = useSearchParamState(
    CLOSED_FILTER_PARAM,
  );
  const [pageParam] = useSearchParamState(
    CLOSED_PAGE_PARAM,
  );
  const { state, reload } = useClosedOrders(
    live?.storeId ?? "",
    live?.version ?? 0,
  );
  const query = search?.trim() ?? "";
  const filter = parseClosedFilter(filterParam);

  // Busca nova começa na primeira página.
  const lastQuery = useRef(query);
  useEffect(() => {
    if (lastQuery.current === query) return;
    lastQuery.current = query;
    setSearchParams(
      { [CLOSED_PAGE_PARAM]: null },
      { replace: true },
    );
  }, [query]);

  if (!live) return null;

  const all = state.status === "ready" ? state.orders : [];
  const summary = summarizeClosed(all);
  const found = query
    ? all.filter((order) =>
        matchesOrderSearch(order, query),
      )
    : all;
  const filtered = applyClosedFilter(found, filter);
  const page = paginate(
    filtered,
    Number(pageParam ?? 1),
    CLOSED_PAGE_SIZE,
  );

  function chooseFilter(id: ClosedFilter) {
    setSearchParams({
      [CLOSED_FILTER_PARAM]: filter === id ? null : id,
      [CLOSED_PAGE_PARAM]: null,
    });
  }

  function goToPage(next: number) {
    setSearchParams({
      [CLOSED_PAGE_PARAM]: next > 1 ? String(next) : null,
    });
    document
      .getElementById("encerrados")
      ?.scrollIntoView({ block: "start" });
  }

  return (
    <section
      id="encerrados"
      aria-labelledby="encerrados-titulo"
      className="scroll-mt-4 overflow-hidden rounded-surface border bg-card"
    >
      <header className="flex min-h-14 flex-wrap items-center gap-x-4 gap-y-3 border-b px-4 py-3 lg:px-6">
        <div className="mr-auto flex min-w-0 flex-col gap-0.5">
          <h2
            id="encerrados-titulo"
            className="flex items-baseline gap-2 text-body leading-tight font-semibold"
          >
            Concluídos e cancelados
            <span className="tabular text-support font-normal text-muted-foreground">
              {state.status === "ready" ? all.length : null}
            </span>
          </h2>
          {summary.counts.concluidos > 0 ? (
            <p className="tabular text-caption text-muted-foreground">
              {formatCurrency(summary.completedTotal)} em
              pedidos concluídos
            </p>
          ) : null}
        </div>
        <SearchParamInput
          name={CLOSED_SEARCH_PARAM}
          placeholder="Buscar concluídos e cancelados"
          label="Buscar nos concluídos e cancelados"
        />
        <div
          role="group"
          aria-label="Filtrar"
          className="flex flex-wrap gap-2"
        >
          {CLOSED_FILTERS.map(({ id, label }) => {
            const count = summary.counts[id];
            const active = filter === id;
            const alert = id === "nao-pagos" && count > 0;
            return (
              <button
                key={id}
                type="button"
                aria-pressed={active}
                onClick={() => chooseFilter(id)}
                className={cn(
                  "flex h-11 shrink-0 items-center gap-2 rounded-control border px-3 text-support whitespace-nowrap outline-none hover:border-muted-foreground focus-visible:ring-2 focus-visible:ring-foreground focus-visible:ring-offset-1 lg:h-9",
                  active
                    ? "border-foreground bg-foreground font-semibold text-background hover:border-foreground"
                    : "bg-card text-foreground",
                )}
              >
                {label}
                <span
                  className={cn(
                    "tabular inline-flex h-5 min-w-5 items-center justify-center rounded-control text-caption font-semibold",
                    alert
                      ? "bg-destructive px-1 text-destructive-foreground"
                      : active
                        ? "text-background"
                        : "text-muted-foreground",
                  )}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </header>

      <div
        aria-hidden
        className={cn(
          COLUMNS,
          "h-10 items-center border-b px-4 text-caption font-medium text-muted-foreground",
        )}
      >
        <span>Nº</span>
        <span>Hora</span>
        <span>Cliente</span>
        <span className="max-lg:hidden">Modo</span>
        <span className="max-lg:hidden">Pagamento</span>
        <span className="max-lg:hidden">Status</span>
        <span className="text-right">Total</span>
      </div>

      {state.status === "loading" ? (
        <LoadingRows />
      ) : state.status === "error" ? (
        <Notice
          title="Não foi possível carregar a lista"
          text="Confira a conexão e tente de novo."
          action={{
            label: "Tentar de novo",
            onClick: reload,
          }}
        />
      ) : all.length === 0 ? (
        <p className="border-b px-4 py-4 text-support text-muted-foreground lg:px-6">
          Nenhum pedido concluído ainda.
        </p>
      ) : page.items.length === 0 ? (
        <Notice
          title="Nenhum resultado"
          text={
            query
              ? `Nada encontrado para "${query}"${filter ? " neste filtro" : ""}.`
              : "Nenhum pedido neste filtro."
          }
          action={{
            label: query ? "Limpar busca" : "Limpar filtro",
            onClick: () =>
              setSearchParams(
                query
                  ? { [CLOSED_SEARCH_PARAM]: null }
                  : { [CLOSED_FILTER_PARAM]: null },
                { replace: true },
              ),
          }}
        />
      ) : (
        <ul className="-mb-px flex flex-col">
          {page.items.map((order) => (
            <li key={order.id}>
              <ClosedOrderRow
                order={order}
                selected={selected === String(order.number)}
              />
            </li>
          ))}
        </ul>
      )}

      {page.pageCount > 1 ? (
        <Pagination
          page={page.page}
          pageCount={page.pageCount}
          first={page.first}
          last={page.last}
          total={filtered.length}
          onPageChange={goToPage}
          className="border-t px-4 py-3 lg:px-6"
        />
      ) : null}
    </section>
  );
}

function ClosedOrderRow({
  order,
  selected,
}: {
  order: ClosedOrder;
  selected: boolean;
}) {
  const completed = isCompleted(order);
  const status = CLOSED_STATUS_LABELS[order.status];
  return (
    <button
      type="button"
      aria-label={`Abrir pedido ${order.number} de ${order.customerName}, ${status}`}
      onClick={() =>
        setSearchParams({
          [ORDER_PARAM]: selected
            ? null
            : String(order.number),
        })
      }
      className={cn(
        COLUMNS,
        "min-h-14 w-full items-center border-b px-4 py-2 text-left text-body outline-none hover:bg-muted/60 focus-visible:bg-muted focus-visible:ring-2 focus-visible:ring-foreground focus-visible:ring-inset",
        selected && "bg-muted",
      )}
    >
      <span className="tabular">{order.number}</span>
      <span className="tabular text-support text-muted-foreground">
        {formatStoreTime(order.createdAt)}
      </span>
      <span className="flex min-w-0 flex-col">
        <span className="truncate">
          {order.customerName}
        </span>
        <span
          className={cn(
            "truncate text-support lg:hidden",
            completed
              ? "text-muted-foreground"
              : "text-destructive",
          )}
        >
          {status}
          {isUnpaid(order) ? (
            <span className="text-foreground">
              {" "}
              · Não pago
            </span>
          ) : null}
        </span>
      </span>
      <span className="flex items-center gap-1.5 text-support max-lg:hidden">
        <OrderModeIcon
          mode={order.mode}
          className="shrink-0 -translate-y-[1px]"
        />
        {MODE_LABELS[order.mode]}
      </span>
      <span className="flex min-w-0 items-center gap-2 text-support max-lg:hidden">
        {PAYMENT_LABELS[order.paymentMethod]}
        <PaidTag order={order} />
      </span>
      <span
        className={cn(
          "text-support max-lg:hidden",
          completed
            ? "text-muted-foreground"
            : "text-destructive",
        )}
      >
        {status}
      </span>
      <span
        className={cn(
          "tabular text-right",
          !completed &&
            "text-muted-foreground line-through",
        )}
      >
        {formatCurrency(order.total)}
      </span>
    </button>
  );
}

/**
 * Pago em verde; "Não pago" só nos concluídos, que é o que falta acertar.
 * Cancelado pago continua aparecendo, porque pode precisar de estorno.
 */
function PaidTag({ order }: { order: ClosedOrder }) {
  if (order.isPaid)
    return (
      <span className="inline-flex items-center gap-0.5 font-semibold text-success">
        <Check
          aria-hidden
          className="size-3.5"
          strokeWidth={3}
        />
        Pago
      </span>
    );
  if (isUnpaid(order))
    return <Badge variant="warning">Não pago</Badge>;
  return null;
}

function LoadingRows() {
  return (
    <div
      role="status"
      aria-label="Carregando pedidos"
      className="flex flex-col"
    >
      {[0, 1, 2].map((row) => (
        <div
          key={row}
          className={cn(
            COLUMNS,
            "h-14 items-center border-b px-4",
          )}
        >
          {[0, 1, 2, 3, 4, 5, 6].map((cell) => (
            <span
              key={cell}
              className={cn(
                "rounded h-3.5 animate-pulse bg-muted",
                cell > 2 && cell < 6 && "max-lg:hidden",
              )}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

function Notice({
  title,
  text,
  action,
}: {
  title: string;
  text: string;
  action: { label: string; onClick: () => void };
}) {
  return (
    <div className="flex flex-col items-center gap-1 border-b px-4 py-8 text-center">
      <p className="text-body font-medium">{title}</p>
      <p className="max-w-80 text-support leading-snug text-pretty text-muted-foreground">
        {text}
      </p>
      <Button
        type="button"
        onClick={action.onClick}
        variant="outline"
        size="sm"
        className="mt-3 font-semibold"
      >
        {action.label}
      </Button>
    </div>
  );
}
