// Loja pelo endereço público (slug). Leitura anônima, passa pelo RLS.
import "server-only";

import { createServerSupabase } from "@/lib/supabase/server";
import type { StoreAppearance } from "@/lib/store/theme";

import { readStoreAppearance } from "./store-settings";

export type PublicStore = {
  id: string;
  slug: string;
  name: string;
  appearance: StoreAppearance;
};

/** Loja ativa pelo slug, ou null se não existir. */
export async function findStoreBySlug(
  slug: string,
): Promise<PublicStore | null> {
  const supabase = await createServerSupabase();
  const { data, error } = await supabase
    .from("stores")
    .select("id, slug, name, settings")
    .eq("slug", slug)
    .eq("active", true)
    .is("deleted_at", null)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  return {
    id: data.id,
    slug: data.slug,
    name: data.name,
    appearance: readStoreAppearance(data.settings),
  };
}
