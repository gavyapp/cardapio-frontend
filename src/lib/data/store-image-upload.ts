// Envio de imagem da loja direto do navegador para o Storage. O arquivo não
// passa pelo servidor do Next; o RLS do bucket confere se quem está logado é
// membro da loja dona da pasta.
import { resizeImageToWebp } from "@/lib/image-resize";
import {
  MAX_IMAGE_BYTES,
  STORE_IMAGES_BUCKET,
  buildStoreImagePath,
  isAcceptedImageType,
  type StoreImageKind,
} from "@/lib/store-images";
import { createBrowserSupabase } from "@/lib/supabase/browser";

export type UploadStoreImageResult =
  { ok: true; url: string } | { ok: false; error: string };

/**
 * Reduz a imagem e grava em "<store_id>/<kind>/<uuid>.webp". Devolve a URL
 * pública para salvar no registro (products.image_url, por exemplo). Quem
 * troca uma imagem por outra apaga a anterior no servidor ao salvar, com
 * removeReplacedStoreImage.
 */
export async function uploadStoreImage({
  storeId,
  kind,
  file,
}: {
  storeId: string;
  kind: StoreImageKind;
  file: File;
}): Promise<UploadStoreImageResult> {
  if (!isAcceptedImageType(file.type)) {
    return {
      ok: false,
      error: "Envie uma imagem JPG, PNG ou WebP.",
    };
  }

  let image: Blob;
  try {
    image = await resizeImageToWebp(file);
  } catch (error) {
    return {
      ok: false,
      error:
        error instanceof Error
          ? error.message
          : "Não foi possível ler a imagem.",
    };
  }

  if (image.size > MAX_IMAGE_BYTES) {
    return {
      ok: false,
      error: "A imagem passou de 2 MB mesmo reduzida.",
    };
  }

  const path = buildStoreImagePath(
    storeId,
    kind,
    crypto.randomUUID(),
  );
  const storage = createBrowserSupabase().storage.from(
    STORE_IMAGES_BUCKET,
  );
  const { error } = await storage.upload(path, image, {
    contentType: "image/webp",
    cacheControl: "31536000",
    upsert: false,
  });

  if (error) {
    return {
      ok: false,
      error:
        "Não foi possível enviar a imagem. Tente de novo.",
    };
  }

  return {
    ok: true,
    url: storage.getPublicUrl(path).data.publicUrl,
  };
}
