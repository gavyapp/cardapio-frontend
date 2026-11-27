// Pedido como o cliente o acompanha depois de enviar: o que a função
// get_order_by_token devolve, o título de cada status e o link de suporte.
// Puro, sem React, para ser testável.
import { z } from "zod";

import { Constants } from "@/lib/database.types";

import type { OrderStatus } from "./status";

/** De quanto em quanto tempo a tela reconsulta o status. */
export const STATUS_REFRESH_SECONDS = 10;

/** Formato do public_token: 32 dígitos hexadecimais. */
const TOKEN_FORMAT = /^[0-9a-f]{32}$/;

export function isOrderToken(value: string): boolean {
  return TOKEN_FORMAT.test(value);
}

const text = z
  .string()
  .nullish()
  .transform((value) => value?.trim() || null);

/** Taxa que a entrega grátis deixou de cobrar; null se não houve. */
function waivedDeliveryFee(
  promotions: readonly { kind: string; amount: number }[],
): number | null {
  const free = promotions.find(
    (promotion) => promotion.kind === "free_delivery",
  );
  return free && free.amount > 0 ? free.amount : null;
}

/** Quanto as promoções dos produtos tiraram do pedido; 0 se nenhuma. */
function itemSavings(
  promotions: readonly { kind: string; amount: number }[],
): number {
  const cents = promotions
    .filter(
      (promotion) => promotion.kind === "product_discount",
    )
    .reduce(
      (sum, promotion) =>
        sum + Math.round(promotion.amount * 100),
      0,
    );
  return cents / 100;
}

const trackedOrderSchema = z
  .object({
    number: z.number(),
    status: z.enum(Constants.public.Enums.order_status),
    mode: z.enum(Constants.public.Enums.order_mode),
    customer_name: z.string(),
    address: z
      .object({
        street: text,
        number: text,
        district: text,
        complement: text,
        reference: text,
      })
      .nullish(),
    payment_method: z.enum(
      Constants.public.Enums.payment_method,
    ),
    change_for: z.number().nullish(),
    subtotal: z.number(),
    delivery_fee: z.number(),
    discount: z.number(),
    total: z.number(),
    // Pedido de antes das promoções pode vir sem a lista.
    applied_promotions: z
      .array(
        z.object({
          kind: z.string(),
          amount: z.number(),
        }),
      )
      .nullish(),
    rejection_reason: text,
    created_at: z.string(),
    store: z.object({
      name: z.string(),
      slug: z.string(),
      phone: text,
    }),
    items: z.array(
      z.object({
        id: z.string(),
        name: z.string(),
        quantity: z.number(),
        notes: text,
        total: z.number(),
        complements: z.array(
          z.object({
            name: z.string(),
            quantity: z.number(),
          }),
        ),
      }),
    ),
    events: z.array(
      z.object({
        to_status: z.enum(
          Constants.public.Enums.order_status,
        ),
        note: text,
        created_at: z.string(),
      }),
    ),
  })
  .transform((order) => ({
    number: order.number,
    status: order.status,
    mode: order.mode,
    customerName: order.customer_name,
    address: order.address ?? null,
    paymentMethod: order.payment_method,
    changeFor: order.change_for ?? null,
    subtotal: order.subtotal,
    deliveryFee: order.delivery_fee,
    discount: order.discount,
    total: order.total,
    waivedDeliveryFee: waivedDeliveryFee(
      order.applied_promotions ?? [],
    ),
    itemSavings: itemSavings(
      order.applied_promotions ?? [],
    ),
    rejectionReason: order.rejection_reason,
    createdAt: order.created_at,
    store: order.store,
    items: order.items,
    events: order.events.map((event) => ({
      toStatus: event.to_status,
      note: event.note,
      createdAt: event.created_at,
    })),
  }));

export type TrackedOrder = z.output<
  typeof trackedOrderSchema
>;

/**
 * Por quantas horas o link do pedido segue válido depois de o pedido
 * encerrar. Quem aplica é o banco (get_order_by_token); aqui o valor serve
 * ao atalho do cardápio. Mudou lá, muda aqui.
 */
export const ORDER_LINK_VALID_HOURS = 4;

/** Resultado da consulta de um pedido pelo token do link. */
export type TrackedOrderLookup =
  | { state: "found"; order: TrackedOrder }
  /** O pedido encerrou há mais tempo que a validade do link. */
  | { state: "expired" }
  | { state: "missing" };

const expiredSchema = z.object({
  expired: z.literal(true),
});

/** Lê a resposta do banco: o pedido, o aviso de link vencido ou nada. */
export function parseTrackedOrder(
  data: unknown,
): TrackedOrderLookup {
  if (data === null || data === undefined) {
    return { state: "missing" };
  }
  if (expiredSchema.safeParse(data).success) {
    return { state: "expired" };
  }
  return {
    state: "found",
    order: trackedOrderSchema.parse(data),
  };
}

/** Status que não muda mais: a tela para de reconsultar. */
export function isFinalStatus(
  status: OrderStatus,
): boolean {
  return (
    status === "CONCLUIDO" ||
    status === "REJEITADO" ||
    status === "CANCELADO"
  );
}

/**
 * Quando a loja recusou ou cancelou o pedido (ISO). Null se o pedido não
 * foi recusado nem cancelado.
 */
export function stoppedAt(
  order: Pick<TrackedOrder, "status" | "events">,
): string | null {
  if (
    order.status !== "REJEITADO" &&
    order.status !== "CANCELADO"
  ) {
    return null;
  }
  return (
    order.events
      .filter((event) => event.toStatus === order.status)
      .map((event) => event.createdAt)
      .sort()
      .at(-1) ?? null
  );
}

export type TrackingHeadline = {
  title: string;
  description: string;
  tone: "waiting" | "progress" | "done" | "stopped";
};

/** Título e frase do topo da tela, conforme o status de agora. */
export function trackingHeadline(
  order: Pick<TrackedOrder, "status" | "mode">,
): TrackingHeadline {
  const delivery = order.mode === "ENTREGA";
  switch (order.status) {
    case "RECEBIDO":
      return {
        title: "Pedido enviado",
        description:
          "A loja recebeu seu pedido e já vai confirmar.",
        tone: "waiting",
      };
    case "EM_PREPARO":
      return {
        title: "Pedido em preparo",
        description:
          "A loja aceitou e está preparando seu pedido.",
        tone: "progress",
      };
    case "PRONTO":
      return delivery
        ? {
            title: "Pedido pronto",
            description:
              "Seu pedido está pronto e sai para entrega em instantes.",
            tone: "progress",
          }
        : {
            title: "Pronto para retirada",
            description:
              "Seu pedido está pronto. É só buscar no balcão.",
            tone: "progress",
          };
    case "A_CAMINHO":
      return {
        title: "Saiu para entrega",
        description: "Seu pedido está a caminho.",
        tone: "progress",
      };
    case "CONCLUIDO":
      return {
        title: delivery
          ? "Pedido entregue"
          : "Pedido retirado",
        description: "Bom apetite!",
        tone: "done",
      };
    case "REJEITADO":
      return {
        title: "Pedido recusado",
        description: "A loja não pôde aceitar este pedido.",
        tone: "stopped",
      };
    case "CANCELADO":
      return {
        title: "Pedido cancelado",
        description: "Este pedido foi cancelado pela loja.",
        tone: "stopped",
      };
  }
}

/**
 * Link do WhatsApp da loja com o número do pedido na mensagem. Null quando
 * a loja não tem telefone válido.
 */
export function supportUrl(
  phone: string | null,
  orderNumber: number,
): string | null {
  const digits = (phone ?? "").replace(/\D/g, "");
  if (digits.length !== 10 && digits.length !== 11)
    return null;
  const message = `Olá! Preciso de ajuda com o pedido #${orderNumber}.`;
  return `https://wa.me/55${digits}?text=${encodeURIComponent(message)}`;
}

/** "Rua A, 10 – Centro · Apto 2 · perto da praça". */
export function formatDeliveryAddress(
  address: NonNullable<TrackedOrder["address"]>,
): string {
  const street = [address.street, address.number]
    .filter(Boolean)
    .join(", ");
  const local = [street, address.district]
    .filter(Boolean)
    .join(" – ");
  return [local, address.complement, address.reference]
    .filter(Boolean)
    .join(" · ");
}
