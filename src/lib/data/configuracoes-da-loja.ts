// Configurações da loja (coluna stores.settings, jsonb).
//
// O create_order lê estas chaves para validar e calcular o pedido. Os padrões
// abaixo são os mesmos que ele aplica quando a chave não existe, para o
// cardápio e o checkout mostrarem exatamente o que o banco vai cobrar.
// Chave nova em settings entra primeiro aqui.
import { z } from "zod";

import { Constants, type Enums, type Json } from "@/lib/database.types";

const valorEmReais = z.number().finite().nonnegative();

export const formasDePagamento = Constants.public.Enums.payment_method;

export const configuracoesDaLojaSchema = z.object({
  // Subtotal mínimo do pedido. Sem a chave: 0.
  min_order: valorEmReais.optional(),
  // Taxa de entrega cobrada em pedidos ENTREGA. Sem a chave: 0.
  delivery_fee: valorEmReais.optional(),
  // A partir deste subtotal a entrega sai grátis. Sem a chave: nunca.
  free_delivery_above: valorEmReais.nullable().optional(),
  // Formas de pagamento aceitas. Sem a chave: todas.
  payment_methods: z.array(z.enum(formasDePagamento)).optional(),
});

/** Formato gravado em stores.settings. */
export type ConfiguracoesDaLoja = z.infer<typeof configuracoesDaLojaSchema>;

/** Configurações com os padrões do create_order já aplicados. */
export type RegrasDaLoja = {
  pedidoMinimo: number;
  taxaDeEntrega: number;
  entregaGratisAPartirDe: number | null;
  formasDePagamento: Enums<"payment_method">[];
};

/**
 * Lê stores.settings como vem do banco. Lança erro se o conteúdo não bate com
 * o schema, porque aí o create_order também falharia (ou cobraria errado).
 */
export function lerConfiguracoesDaLoja(settings: Json): RegrasDaLoja {
  const configuracoes = configuracoesDaLojaSchema.parse(settings ?? {});

  return {
    pedidoMinimo: configuracoes.min_order ?? 0,
    taxaDeEntrega: configuracoes.delivery_fee ?? 0,
    entregaGratisAPartirDe: configuracoes.free_delivery_above ?? null,
    formasDePagamento: configuracoes.payment_methods ?? [...formasDePagamento],
  };
}

/** Taxa de entrega de um pedido, pela mesma regra do create_order. */
export function calcularTaxaDeEntrega(
  regras: RegrasDaLoja,
  modo: Enums<"order_mode">,
  subtotal: number,
): number {
  if (modo !== "ENTREGA") return 0;
  if (regras.entregaGratisAPartirDe !== null && subtotal >= regras.entregaGratisAPartirDe) {
    return 0;
  }
  return regras.taxaDeEntrega;
}
