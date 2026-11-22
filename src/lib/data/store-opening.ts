// Botão de abrir e fechar a loja no painel (stores.is_open_override e
// open_override_until), com os turnos que dão o status pelo horário.
import "server-only";

import type { Shift } from "@/lib/store/opening";
import { createServerSupabase } from "@/lib/supabase/server";

import { listStoreHours } from "./store-details";

export type StoreOpening = {
  /** null segue o horário; true aberta; false fechada. */
  override: boolean | null;
  /** Até quando o botão vale (ISO); null vale até mudar à mão. */
  until: string | null;
  shifts: Shift[];
};

/** Botão e turnos da loja logada. Passa pelo RLS. */
export async function findStoreOpening(
  storeId: string,
): Promise<StoreOpening> {
  const supabase = await createServerSupabase();
  const [{ data, error }, shifts] = await Promise.all([
    supabase
      .from("stores")
      .select("is_open_override, open_override_until")
      .eq("id", storeId)
      .maybeSingle(),
    listStoreHours(storeId),
  ]);
  if (error) throw error;

  return {
    override: data?.is_open_override ?? null,
    until: data?.open_override_until ?? null,
    shifts: shifts.map(
      ({ weekday, opensAt, closesAt }) => ({
        weekday,
        opensAt,
        closesAt,
      }),
    ),
  };
}

/** Grava o botão; override null volta a seguir o horário. */
export async function saveStoreOpening(
  storeId: string,
  opening: { override: boolean | null; until: Date | null },
): Promise<void> {
  const supabase = await createServerSupabase();
  const { error } = await supabase
    .from("stores")
    .update({
      is_open_override: opening.override,
      open_override_until:
        opening.until?.toISOString() ?? null,
    })
    .eq("id", storeId);
  if (error) throw error;
}
