import type { ReactNode } from "react";

import { StoreAvatar } from "@/components/atoms/store-avatar";
import { StoreStatusLine } from "@/components/molecules/store-status-line";
import type { StoreStatus } from "@/lib/store/opening";

/**
 * Topo do cardápio: capa, logo, nome da loja, status com o próximo horário
 * e o acesso a "Mais informações". Sem capa, o topo fica só com a marca.
 */
export function MenuHero({
  id,
  store,
  status,
  info,
}: {
  id: string;
  store: {
    name: string;
    logoUrl: string | null;
    coverUrl: string | null;
    primaryColor: string;
  };
  status: StoreStatus;
  /** O botão de "Mais informações". */
  info: ReactNode;
}) {
  return (
    <header id={id} className="flex flex-col">
      {store.coverUrl ? (
        // Decorativa: o nome da loja vem logo abaixo.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={store.coverUrl}
          alt=""
          className="-mx-4 h-44 w-[calc(100%+2rem)] max-w-none bg-muted object-cover sm:h-64 lg:mx-0 lg:mt-6 lg:h-80 lg:w-full lg:rounded-surface"
        />
      ) : null}

      <div className="flex items-end gap-4">
        <StoreAvatar
          name={store.name}
          primaryColor={store.primaryColor}
          imageUrl={store.logoUrl}
          className={
            store.coverUrl
              ? "-mt-10 size-20 rounded-surface border-4 border-background text-section-title"
              : "mt-6 size-20 rounded-surface text-section-title"
          }
        />
        <div className="flex min-w-0 flex-col gap-1 pt-3">
          <h1 className="truncate text-page-title leading-tight font-semibold">
            {store.name}
          </h1>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <StoreStatusLine
              isOpen={status.isOpen}
              hint={
                status.closingLabel ??
                status.nextOpeningLabel
              }
            />
            {info}
          </div>
        </div>
      </div>
    </header>
  );
}
