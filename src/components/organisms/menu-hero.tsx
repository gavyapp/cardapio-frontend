import type { ReactNode } from "react";

import { StoreAvatar } from "@/components/atoms/store-avatar";
import { MenuSearchButton } from "@/components/molecules/menu-search-button";
import { StoreStatusLine } from "@/components/molecules/store-status-line";
import type { StoreStatus } from "@/lib/store/opening";

/**
 * Topo do cardápio: capa com a lupa da busca, logo, nome da loja, status
 * com o próximo horário e o acesso a "Mais informações". Sem capa, o topo
 * fica só com a marca e a lupa ao lado do nome.
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
        <div className="relative -mx-4 lg:mx-0 lg:mt-6">
          {/* Decorativa: o nome da loja vem logo abaixo. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={store.coverUrl}
            alt=""
            className="h-44 w-full bg-muted object-cover sm:h-64 lg:h-80 lg:rounded-surface"
          />
          <MenuSearchButton
            variant="overlay"
            className="absolute top-4 right-4"
          />
        </div>
      ) : null}

      <div className="relative flex items-end gap-4">
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
        <div className="flex min-w-0 flex-1 flex-col gap-1 pt-3">
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
        {store.coverUrl ? null : (
          <MenuSearchButton
            variant="icon"
            className="self-center"
          />
        )}
      </div>
    </header>
  );
}
