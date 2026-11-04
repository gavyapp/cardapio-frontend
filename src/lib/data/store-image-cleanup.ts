// Limpeza de imagens da loja no servidor. Roda com a sessão do lojista, então
// o RLS do bucket só deixa apagar arquivos da própria loja.
import "server-only";

import {
  STORE_IMAGES_BUCKET,
  storeImagePathFromUrl,
} from "@/lib/store-images";
import { createServerSupabase } from "@/lib/supabase/server";

/**
 * Apaga a imagem anterior depois que o registro passou a usar outra (ou
 * nenhuma). Chame só depois de salvar o registro, para nunca apagar a imagem
 * que ainda está em uso. URL de fora do bucket (como as do seed) é ignorada.
 * Falha na remoção não desfaz o salvamento: o arquivo só fica órfão.
 */
export async function removeReplacedStoreImage(
  previousUrl: string | null | undefined,
  currentUrl: string | null | undefined,
): Promise<void> {
  if (!previousUrl || previousUrl === currentUrl) return;
  const path = storeImagePathFromUrl(previousUrl);
  if (!path) return;

  const supabase = await createServerSupabase();
  const { error } = await supabase.storage
    .from(STORE_IMAGES_BUCKET)
    .remove([path]);
  if (error) {
    console.error(
      `Imagem antiga não removida (${path}): ${error.message}`,
    );
  }
}
