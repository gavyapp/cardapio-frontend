// Redução de imagem no navegador antes do envio: o lado maior fica com até
// MAX_IMAGE_SIDE px e o arquivo sai em WebP. Foto de celular (4 MB, 4000 px)
// vira algumas centenas de KB, dentro do limite do bucket.
import { MAX_IMAGE_SIDE } from "@/lib/store-images";

const WEBP_QUALITY = 0.85;

/** Medidas finais mantendo a proporção, sem ampliar imagem pequena. */
export function fitWithin(
  width: number,
  height: number,
  maxSide: number = MAX_IMAGE_SIDE,
): { width: number; height: number } {
  const largest = Math.max(width, height);
  if (largest <= maxSide) return { width, height };
  const scale = maxSide / largest;
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}

/** Lê a imagem, reduz e devolve um WebP. Só roda no navegador. */
export async function resizeImageToWebp(
  file: Blob,
): Promise<Blob> {
  // "from-image" respeita a rotação gravada pela câmera do celular (EXIF).
  const bitmap = await createImageBitmap(file, {
    imageOrientation: "from-image",
  });
  try {
    const size = fitWithin(bitmap.width, bitmap.height);
    const canvas = document.createElement("canvas");
    canvas.width = size.width;
    canvas.height = size.height;
    const context = canvas.getContext("2d");
    if (!context) {
      throw new Error(
        "Não foi possível preparar a imagem.",
      );
    }
    context.drawImage(
      bitmap,
      0,
      0,
      size.width,
      size.height,
    );

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/webp", WEBP_QUALITY),
    );
    // Navegador sem encoder WebP devolve PNG; aí o tipo não bate.
    if (!blob || blob.type !== "image/webp") {
      throw new Error(
        "Este navegador não converte a imagem. Tente outro navegador.",
      );
    }
    return blob;
  } finally {
    bitmap.close();
  }
}
