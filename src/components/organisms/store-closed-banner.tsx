"use client";

import { toast } from "sonner";

import { Button } from "@/components/atoms/button";
import { useStoreOpening } from "@/components/providers/store-opening-provider";
import { reopenMode } from "@/lib/store/opening";

/**
 * Barra do protótipo para a loja fechada à mão, no topo de todas as páginas
 * do painel. Fechada só pelo horário não mostra: é o normal fora do
 * expediente. "Abrir loja" volta ao horário se ele já está aberto; senão,
 * abre agora.
 */
export function StoreClosedBanner() {
  const opening = useStoreOpening();
  if (!opening || opening.mode !== "closed") return null;
  const { shifts, now, saving, choose } = opening;

  async function reopen() {
    const error = await choose(reopenMode(shifts, now));
    if (error) toast.error(error);
  }

  return (
    <div className="mx-auto w-full max-w-7xl px-page pt-4 group-data-fill-viewport/panel:max-w-none sm:pt-6">
      <div
        role="status"
        className="flex min-h-14 flex-wrap items-center gap-x-4 gap-y-3 rounded-surface bg-foreground py-2 pr-3 pl-4 text-background lg:pl-6"
      >
        <span
          aria-hidden
          className="size-2 shrink-0 rounded-full bg-gray-medium"
        />
        <span className="min-w-0 flex-[1_1_200px] text-body font-semibold">
          Loja fechada · os clientes não conseguem pedir
        </span>
        <Button
          size="compact"
          loading={saving}
          onClick={reopen}
          className="bg-background font-semibold text-foreground hover:bg-background hover:opacity-85 lg:px-4 lg:text-body"
        >
          Abrir loja
        </Button>
      </div>
    </div>
  );
}
