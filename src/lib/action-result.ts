import type { ZodError } from "zod";

// Resposta das Server Actions do painel: sucesso, ou a mensagem que a tela
// mostra para o lojista.

export type ActionResult =
  { ok: true } | { ok: false; error: string };

/** Sucesso com um valor (por exemplo, o id do registro criado). */
export type ActionResultWith<T> =
  { ok: true; data: T } | { ok: false; error: string };

/** Mensagem de erro para o lojista, sem detalhes técnicos. */
export function errorMessage(
  error: unknown,
  fallback = "Não foi possível salvar. Tente de novo.",
): string {
  if (error instanceof UserFacingError)
    return error.message;
  console.error(error);
  return fallback;
}

/** Erro cuja mensagem pode ir direto para a tela. */
export class UserFacingError extends Error {}

/** Primeira mensagem de validação do zod, no formato de erro de action. */
export function validationError(error: ZodError): {
  ok: false;
  error: string;
} {
  return {
    ok: false,
    error: error.issues[0]?.message ?? "Dados inválidos.",
  };
}
