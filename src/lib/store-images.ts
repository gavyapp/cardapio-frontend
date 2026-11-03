// Regras das imagens da loja (fotos de produto, logo e capa), compartilhadas
// entre o envio no navegador e a limpeza no servidor.
//
// O bucket store-assets aceita até 2 MB em JPEG, PNG ou WebP e só deixa um
// membro da loja gravar na pasta "<store_id>/". O navegador confere as mesmas
// regras antes de enviar, para mostrar o erro sem esperar o Storage recusar.

export const STORE_IMAGES_BUCKET = "store-assets";

export const MAX_IMAGE_BYTES = 2 * 1024 * 1024;

export const ACCEPTED_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;

/** Lado maior da imagem depois da redução no navegador. */
export const MAX_IMAGE_SIDE = 1600;

/** Pasta dentro de "<store_id>/" para cada uso da imagem. */
export const STORE_IMAGE_KINDS = [
  "product",
  "logo",
  "cover",
] as const;

export type StoreImageKind =
  (typeof STORE_IMAGE_KINDS)[number];

export function isAcceptedImageType(type: string): boolean {
  return (
    ACCEPTED_IMAGE_TYPES as readonly string[]
  ).includes(type);
}

/** "<store_id>/<kind>/<uuid>.webp" */
export function buildStoreImagePath(
  storeId: string,
  kind: StoreImageKind,
  fileId: string,
): string {
  return `${storeId}/${kind}/${fileId}.webp`;
}

const PUBLIC_PATH_MARKER = `/storage/v1/object/public/${STORE_IMAGES_BUCKET}/`;

/**
 * Caminho do arquivo no bucket a partir da URL pública, ou null se a URL não
 * for do bucket da loja (por exemplo, uma imagem externa do seed).
 */
export function storeImagePathFromUrl(
  url: string | null | undefined,
): string | null {
  if (!url) return null;
  let pathname: string;
  try {
    pathname = new URL(url).pathname;
  } catch {
    return null;
  }
  const index = pathname.indexOf(PUBLIC_PATH_MARKER);
  if (index === -1) return null;
  const path = decodeURIComponent(
    pathname.slice(index + PUBLIC_PATH_MARKER.length),
  );
  return path || null;
}
