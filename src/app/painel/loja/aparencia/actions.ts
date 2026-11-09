"use server";

import { z } from "zod";

import { afterMenuChange } from "@/lib/catalog/menu-cache";
import {
  findStoreAppearance,
  updateStoreTheme,
} from "@/lib/data/store-appearance";
import { removeReplacedStoreImage } from "@/lib/data/store-image-cleanup";
import { requireStoreForAction } from "@/lib/panel/access";
import {
  errorMessage,
  type ActionResult,
  validationError,
} from "@/lib/panel/action-result";

const imageUrl = z
  .string()
  .trim()
  .transform((value) => value || null)
  .pipe(z.url("Imagem inválida.").nullable());

const appearance = z.object({
  primary: z
    .string()
    .trim()
    .regex(/^#[0-9a-fA-F]{6}$/, "Escolha uma cor válida.")
    .transform((value) => value.toLowerCase()),
  mode: z.enum(["light", "dark"], "Escolha o tema."),
  layout: z.enum(["lista", "grade"], "Escolha o layout."),
  welcome: z
    .string()
    .trim()
    .max(140, "Use até 140 caracteres.")
    .transform((value) => value || null),
  logoUrl: imageUrl,
  coverUrl: imageUrl,
});

/** Grava a aparência do cardápio da loja logada a partir do formulário. */
export async function saveAppearanceAction(
  formData: FormData,
): Promise<ActionResult> {
  const text = (key: string) =>
    String(formData.get(key) ?? "");
  const parsed = appearance.safeParse({
    primary: text("primary"),
    mode: text("mode"),
    layout: text("layout"),
    welcome: text("welcome"),
    logoUrl: text("logoUrl"),
    coverUrl: text("coverUrl"),
  });
  if (!parsed.success) return validationError(parsed.error);

  try {
    const store = await requireStoreForAction();
    const previous = await findStoreAppearance(store.id);

    await updateStoreTheme(store.id, {
      primary: parsed.data.primary,
      mode: parsed.data.mode,
      layout: parsed.data.layout,
      // Chave ausente no JSON quando vazio, em vez de string vazia.
      welcome: parsed.data.welcome ?? undefined,
      logo_url: parsed.data.logoUrl,
      cover_url: parsed.data.coverUrl,
    });

    // Só depois de gravar: nunca apaga uma imagem ainda em uso.
    await removeReplacedStoreImage(
      previous.logoUrl,
      parsed.data.logoUrl,
    );
    await removeReplacedStoreImage(
      previous.coverUrl,
      parsed.data.coverUrl,
    );

    afterMenuChange(store.id);
    return { ok: true };
  } catch (error) {
    return { ok: false, error: errorMessage(error) };
  }
}
