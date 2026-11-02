import { Menu } from "lucide-react";

import { Clock } from "./clock";
import { PanelNav } from "./panel-nav";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export type HeaderStore = {
  name: string;
  primaryColor: string;
};

const PLATFORM_NAME =
  process.env.NEXT_PUBLIC_PLATFORM_NAME ?? "Gavy";

function initials(name: string): string {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase() ?? "")
    .join("");
}

export function PanelHeader({
  store,
}: {
  store: HeaderStore | null;
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

          <div className="ml-auto flex items-center gap-3">
            <Clock className="tabular hidden text-[15px] sm:block" />
            {store ? (
              <span
                aria-label={store.name}
                className="flex size-8 items-center justify-center rounded-full text-xs font-semibold"
                style={{
                  backgroundColor: store.primaryColor,
                  color: "var(--primary-foreground)",
                }}
              >
                {initials(store.name)}
              </span>
            ) : null}
            {/* Ainda sem ação; o conteúdo do menu vem depois. */}
            <Button
              variant="ghost"
              size="icon"
              aria-label="Menu"
              className="text-background hover:bg-background/10 hover:text-background"
            >
              <Menu />
            </Button>
          </div>
        </div>
      </div>
      <PanelNav />
    </header>
  );
}
