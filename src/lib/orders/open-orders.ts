// Pedidos em andamento do cliente neste aparelho: o que o cardápio mostra
// para ele voltar ao acompanhamento. Guardados no aparelho, um conjunto por
// loja. Puro, sem React, para ser testável.
import { z } from "zod";

import { Constants } from "@/lib/database.types";

import type { OrderStatus } from "./status";
import { isFinalStatus, isOrderToken } from "./tracking";

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

/** "Novo", "Em preparo"… Null para pedido que já encerrou. */
export function openOrderLabel(
  status: OrderStatus,
): string | null {
  if (isFinalStatus(status)) return null;
  return OPEN_STATUS_LABELS[status] ?? null;
}
