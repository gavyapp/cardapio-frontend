// Status do pedido no painel: motivos padrão de rejeitar e cancelar e a
// mensagem de cada recusa da mudança de status. O banco grava o motivo
// escolhido como texto (rejection_reason e order_events.note).
import type { Enums } from "@/lib/database.types";

export type OrderStatus = Enums<"order_status">;

/** Opção que abre o campo de texto livre. */
export const OTHER_REASON = "Outro";

export const REJECTION_REASONS = [
  "Loja sem condições de atender agora",
  "Endereço fora da área de entrega",
  "Item indisponível",
  OTHER_REASON,
] as const;

export const CANCELLATION_REASONS = [
  "Cliente desistiu",
  "Item acabou durante o preparo",
  "Problema na entrega",
  OTHER_REASON,
] as const;

/** Por que o banco recusou a mudança de status ou de pagamento. */
export type OrderStatusErrorCode =
  | "invalid_transition"
  | "reason_required"
  | "forbidden"
  | "order_not_found";

export const ORDER_STATUS_ERROR_MESSAGES: Record<
  OrderStatusErrorCode,
  string
> = {
  invalid_transition:
    "O pedido não pode ir para esse status. Atualize a tela e tente de novo.",
  reason_required: "Informe o motivo.",
  forbidden: "Você não tem acesso a este pedido.",
  order_not_found: "Pedido não encontrado.",
};
