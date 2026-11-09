import { Clock } from "@/components/atoms/clock";
import { PLATFORM_NAME } from "@/components/atoms/platform-mark";
import { PanelNav } from "@/components/organisms/panel-nav";
import {
  StoreMenu,
  type MenuStore,
} from "@/components/organisms/store-menu";
import { Badge } from "@/components/atoms/badge";
import { StoreAvatar } from "@/components/atoms/store-avatar";
import type { CatalogCounts } from "@/lib/data/catalog-counts";

export type HeaderStore = MenuStore;

export function PanelHeader({
  store,
  catalogCounts,
  onSignOut,
}: {
  store: HeaderStore | null;
  /** Números ao lado de Produtos e Complementos no menu Cardápio. */
  catalogCounts?: CatalogCounts;
  onSignOut?: () => Promise<void>;
}) {
  return (
    <header className="sticky top-0 z-40 bg-card">
      <div className="bg-foreground text-background">
        <div className="flex h-16 items-center gap-3 px-4 sm:px-6">
          {store ? (
            <StoreAvatar
              name={store.name}
              primaryColor={store.primaryColor}
              imageUrl={store.logoUrl}
              className="size-8 rounded-control text-caption"
            />
          ) : (
            <span
              aria-hidden
              className="size-8 shrink-0 rounded-control bg-background"
            />
          )}
          <p className="flex min-w-0 items-center gap-2 text-body">
            <span className="shrink-0 font-semibold">
              {PLATFORM_NAME}
            </span>
            <span className="text-background/50">/</span>
            <span className="truncate">
              {store?.name ?? "Loja"}
            </span>
          </p>
          {/* Estado fixo por enquanto; a regra de loja aberta entra depois. */}
          <Badge className="shrink-0 gap-1.5 bg-success text-success-foreground">
            <span
              aria-hidden
              className="size-1.5 rounded-full bg-current"
            />
            Aberta
          </Badge>

          <div className="ml-auto flex items-center gap-4">
            <Clock className="tabular hidden text-body sm:block" />
            <StoreMenu
              store={store}
              onSignOut={onSignOut}
            />
          </div>
        </div>
      </div>
      <PanelNav catalogCounts={catalogCounts} />
    </header>
  );
}
