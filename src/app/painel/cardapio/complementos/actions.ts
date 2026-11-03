"use server";

import { z } from "zod";

import {
  errorMessage,
  validationError,
  type ActionResult,
  type ActionResultWith,
} from "@/lib/action-result";
import {
  deleteComplementGroup,
  reorderComplementGroups,
  saveComplementGroup,
  setComplementAvailability,
} from "@/lib/data/complement-groups";
import { afterMenuChange } from "@/lib/menu-cache";
import { requireStoreForAction } from "@/lib/panel-access";

const id = z.uuid();

const groupSchema = z
  .object({
    id: id.optional(),
    name: z
      .string()
      .trim()
      .min(1, "Dê um nome ao grupo.")
      .max(60, "Use até 60 caracteres no nome do grupo."),
    minSelect: z.int().min(0).max(50),
    maxSelect: z
      .int()
      .min(1, "O máximo precisa ser pelo menos 1.")
      .max(50),
    allowRepeat: z.boolean(),
    options: z
      .array(
        z.object({
          id: id.optional(),
          name: z
            .string()
            .trim()
            .min(1, "Dê um nome a cada opção.")
            .max(
              60,
              "Use até 60 caracteres no nome da opção.",
            ),
          price: z
            .number()
            .min(
              0,
              "Preço adicional não pode ser negativo.",
            )
            .max(9999.99),
          isAvailable: z.boolean(),
        }),
      )
      .min(1, "Adicione pelo menos 1 opção.")
      .max(100),
  })
  .refine((group) => group.minSelect <= group.maxSelect, {
    message: "O mínimo não pode ser maior que o máximo.",
  })
  .refine(
    (group) =>
      group.allowRepeat ||
      group.maxSelect <= group.options.length,
    {
      message:
        "O máximo passa do número de opções. Diminua o máximo ou adicione opções.",
    },
  );

export async function saveComplementGroupAction(
  input: z.input<typeof groupSchema>,
): Promise<ActionResultWith<string>> {
  const parsed = groupSchema.safeParse(input);
  if (!parsed.success) return validationError(parsed.error);
  try {
    const store = await requireStoreForAction();
    const groupId = await saveComplementGroup(
      store.id,
      parsed.data,
    );
    afterMenuChange(store.id);
    return { ok: true, data: groupId };
  } catch (error) {
    return { ok: false, error: errorMessage(error) };
  }
}

export async function setComplementAvailabilityAction(
  complementId: string,
  isAvailable: boolean,
): Promise<ActionResult> {
  const parsed = z
    .object({ complementId: id, isAvailable: z.boolean() })
    .safeParse({ complementId, isAvailable });
  if (!parsed.success) return validationError(parsed.error);
  try {
    const store = await requireStoreForAction();
    await setComplementAvailability(
      store.id,
      parsed.data.complementId,
      parsed.data.isAvailable,
    );
    afterMenuChange(store.id);
    return { ok: true };
  } catch (error) {
    return { ok: false, error: errorMessage(error) };
  }
}

export async function reorderComplementGroupsAction(
  orderedIds: string[],
): Promise<ActionResult> {
  const parsed = z.array(id).max(200).safeParse(orderedIds);
  if (!parsed.success) return validationError(parsed.error);
  try {
    const store = await requireStoreForAction();
    await reorderComplementGroups(store.id, parsed.data);
    afterMenuChange(store.id);
    return { ok: true };
  } catch (error) {
    return { ok: false, error: errorMessage(error) };
  }
}

export async function deleteComplementGroupAction(
  groupId: string,
): Promise<ActionResult> {
  const parsed = id.safeParse(groupId);
  if (!parsed.success) return validationError(parsed.error);
  try {
    const store = await requireStoreForAction();
    await deleteComplementGroup(store.id, parsed.data);
    afterMenuChange(store.id);
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      error: errorMessage(
        error,
        "Não foi possível excluir. Tente de novo.",
      ),
    };
  }
}
