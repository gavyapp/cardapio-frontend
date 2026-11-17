// Pedidos em andamento do cliente neste aparelho: o que o cardápio mostra
// para ele voltar ao acompanhamento. Guardados no aparelho, um conjunto por
// loja. Puro, sem React, para ser testável.
import { z } from "zod";

import { Constants } from "@/lib/database.types";

import type { OrderStatus } from "./status";
import { isOrderToken } from "./tracking";

/** Chave do localStorage: os pedidos em andamento de uma loja. */
export function openOrdersStorageKey(
  storeId: string,
): string {
  return `cardapio:pedidos:${storeId}`;
}

/** Caminho da consulta de status de um pedido. */
export function orderStatusPath(token: string): string {
  return `/api/pedidos/${token}`;
}

/** Quantos pedidos ficam guardados; os mais antigos saem. */
const MAX_REMEMBERED = 5;

const rememberedOrders = z.array(
  z.object({
    token: z.string().refine(isOrderToken),
    number: z.number().int().positive(),
  }),
);

export type RememberedOrder = z.infer<
  typeof rememberedOrders
>[number];

/** Lê o que está guardado. Conteúdo estragado vira lista vazia. */
export function parseRememberedOrders(
  raw: string | null,
): RememberedOrder[] {
  if (!raw) return [];
  try {
    const parsed = rememberedOrders.safeParse(
      JSON.parse(raw),
    );
    return parsed.success ? parsed.data : [];
  } catch {
    return [];
  }
}

/** Acrescenta o pedido recém-enviado, o mais novo primeiro. */
export function rememberOrder(
  orders: readonly RememberedOrder[],
  order: RememberedOrder,
): RememberedOrder[] {
  return [
    order,
    ...orders.filter(({ token }) => token !== order.token),
  ].slice(0, MAX_REMEMBERED);
}

/** Tira da lista os pedidos que já encerraram ou não existem mais. */
export function forgetOrders(
  orders: readonly RememberedOrder[],
  tokens: readonly string[],
): RememberedOrder[] {
  return orders.filter(
    ({ token }) => !tokens.includes(token),
  );
}

const orderStatusResponse = z.object({
  number: z.number(),
  status: z.enum(Constants.public.Enums.order_status),
  /** Quando a loja recusou ou cancelou o pedido (ISO); null nos demais. */
  stoppedAt: z.string().nullable(),
});

/** O que a consulta de status devolve. */
export type OrderStatusResponse = z.infer<
  typeof orderStatusResponse
>;

export type OrderStatusLookup =
  | { found: true; order: OrderStatusResponse }
  /** O pedido não existe: pode sair da lista. */
  | { found: false }
  /** Sem resposta (rede, servidor): tenta de novo depois. */
  | { found: null };

/** Consulta o status de um pedido pelo token. Nunca lança. */
export async function lookUpOrderStatus(
  token: string,
  send: typeof fetch = fetch,
): Promise<OrderStatusLookup> {
  try {
    const response = await send(orderStatusPath(token), {
      cache: "no-store",
    });
    if (response.status === 404) return { found: false };
    if (!response.ok) return { found: null };
    const parsed = orderStatusResponse.safeParse(
      await response.json(),
    );
    return parsed.success
      ? { found: true, order: parsed.data }
      : { found: null };
  } catch {
    return { found: null };
  }
}

const OPEN_STATUS_LABELS: Partial<
  Record<OrderStatus, string>
> = {
  RECEBIDO: "Novo",
  EM_PREPARO: "Em preparo",
  PRONTO: "Pronto",
  A_CAMINHO: "Saiu para entrega",
};

const STOPPED_STATUS_LABELS: Partial<
  Record<OrderStatus, string>
> = {
  REJEITADO: "Recusado",
  CANCELADO: "Cancelado",
};

/**
 * Por quanto tempo o pedido recusado ou cancelado segue no cardápio, para
 * o cliente abrir e ver o motivo.
 */
export const STOPPED_ORDER_VISIBLE_HOURS = 4;

export type OrderShortcut = {
  /** "Novo", "Em preparo"… ou "Recusado", "Cancelado". */
  label: string;
  /** Recusado ou cancelado: aparece em vermelho. */
  stopped: boolean;
};

/**
 * O que o cardápio mostra para um pedido do cliente. Em andamento, o status
 * de agora. Recusado ou cancelado, o aviso por algumas horas, para ele ver
 * o motivo. Null quando o pedido sai da lista: concluído, ou recusado ou
 * cancelado há mais tempo.
 */
export function orderShortcut(
  order: Pick<OrderStatusResponse, "status" | "stoppedAt">,
  now: Date,
): OrderShortcut | null {
  const open = OPEN_STATUS_LABELS[order.status];
  if (open) return { label: open, stopped: false };

  const stopped = STOPPED_STATUS_LABELS[order.status];
  if (!stopped || !order.stoppedAt) return null;
  const hours =
    (now.getTime() - new Date(order.stoppedAt).getTime()) /
    3_600_000;
  // Hora inválida vira NaN e cai fora da janela.
  return hours < STOPPED_ORDER_VISIBLE_HOURS
    ? { label: stopped, stopped: true }
    : null;
}
