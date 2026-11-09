// Aparência do cardápio (stores.settings.theme) para a tela do painel.
import "server-only";

import type { StoreAppearance } from "@/lib/store/theme";
import { createServerSupabase } from "@/lib/supabase/server";

import {
  readStoreAppearance,
  storeThemeSchema,
  type StoreTheme,
} from "./store-settings";

/** Aparência da loja com os padrões aplicados. Passa pelo RLS. */
export async function findStoreAppearance(
  storeId: string,
): Promise<StoreAppearance> {
  const supabase = await createServerSupabase();
  const { data, error } = await supabase
    .from("stores")
    .select("settings")
    .eq("id", storeId)
    .is("deleted_at", null)
    .single();
  if (error) throw error;
  return readStoreAppearance(data.settings);
}

/**
 * Grava o tema sem perder as outras chaves de settings nem as chaves do
 * tema que a tela não mexe (como a fonte). Valida pelo schema antes.
 */
export async function updateStoreTheme(
  storeId: string,
  patch: StoreTheme,
): Promise<void> {
  const supabase = await createServerSupabase();
  const { data, error } = await supabase
    .from("stores")
    .select("settings")
    .eq("id", storeId)
    .is("deleted_at", null)
    .single();
  if (error) throw error;

  const current =
    data.settings &&
    typeof data.settings === "object" &&
    !Array.isArray(data.settings)
      ? data.settings
      : {};
  const currentTheme =
    "theme" in current &&
    current.theme &&
    typeof current.theme === "object" &&
    !Array.isArray(current.theme)
      ? current.theme
      : {};

  const settings = {
    ...current,
    theme: storeThemeSchema.parse({
      ...currentTheme,
      ...patch,
    }),
  };

  const { error: updateError } = await supabase
    .from("stores")
    .update({ settings })
    .eq("id", storeId)
    .is("deleted_at", null);
  if (updateError) throw updateError;
}
