import { Clock } from "@/components/atoms/clock";
import { PanelNav } from "@/components/organisms/panel-nav";
import {
  StoreMenu,
  type MenuStore,
} from "@/components/organisms/store-menu";
import { Badge } from "@/components/atoms/badge";

export type HeaderStore = MenuStore;

const PLATFORM_NAME =
  process.env.NEXT_PUBLIC_PLATFORM_NAME ?? "Gavy";

export function PanelHeader({
  store,
  onSignOut,
}: {
  store: HeaderStore | null;
  onSignOut?: () => Promise<void>;
}) {
  return (
    <header className="bg-card">
      <div className="bg-foreground text-background">
        <div className="flex h-16 items-center gap-3 px-4 sm:px-6">
          <span
            aria-hidden
            className="size-7 shrink-0 rounded-md bg-background"
          />
          <p className="flex min-w-0 items-center gap-2 text-[15px]">
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
            <Clock className="tabular hidden text-[15px] sm:block" />
            <StoreMenu
              store={store}
              onSignOut={onSignOut}
            />
          </div>
        </div>
      </div>
      <PanelNav />
    </header>
  );
}
