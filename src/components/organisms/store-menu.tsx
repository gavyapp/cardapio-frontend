"use client";

import Link from "next/link";
import { useSyncExternalStore } from "react";
import {
  Contrast,
  Copy,
  ExternalLink,
  LogOut,
  Menu,
  SlidersHorizontal,
} from "lucide-react";
import { toast } from "sonner";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/atoms/dropdown-menu";
import { StoreAvatar } from "@/components/atoms/store-avatar";
import { publicStoreUrl } from "@/lib/subdomain";

export type MenuStore = {
  slug: string;
  name: string;
  primaryColor: string;
};

const itemClass =
  "gap-3 px-3 py-2.5 text-[15px] [&_svg]:size-5 [&_svg]:text-muted-foreground";

export function StoreMenu({
  store,
}: {
  store: MenuStore | null;
}) {
  const menuUrl = () =>
    publicStoreUrl(
      store?.slug ?? "",
      window.location.origin,
    );

  async function copyMenuLink() {
    try {
      await navigator.clipboard.writeText(menuUrl());
      toast.success("Link do cardápio copiado");
    } catch {
      toast.error("Não foi possível copiar o link");
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label="Menu da loja"
        className="flex h-11 items-center gap-2 rounded-full bg-background/15 py-1 pr-2 pl-1 transition-colors outline-none hover:bg-background/25 focus-visible:ring-3 focus-visible:ring-background/40 data-popup-open:bg-background/25"
      >
        {store ? (
          <StoreAvatar
            name={store.name}
            primaryColor={store.primaryColor}
            className="size-9 text-xs"
          />
        ) : null}
        <Menu className="size-5 text-background" />
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="end"
        sideOffset={8}
        className="w-72 p-0"
      >
        {store ? (
          <div className="flex items-center gap-3 border-b border-border px-3 py-3">
            <StoreAvatar
              name={store.name}
              primaryColor={store.primaryColor}
              className="size-11 text-sm"
            />
            <div className="min-w-0">
              <p className="truncate text-[15px] font-semibold">
                {store.name}
              </p>
              <PublicHost slug={store.slug} />
            </div>
          </div>
        ) : null}

        <div className="p-1.5">
          <DropdownMenuItem
            className={itemClass}
            render={
              <Link href="/painel/loja/configuracoes" />
            }
          >
            <SlidersHorizontal />
            Configurações da loja
          </DropdownMenuItem>
          <DropdownMenuItem
            className={itemClass}
            render={<Link href="/painel/loja/aparencia" />}
          >
            <Contrast />
            Aparência
          </DropdownMenuItem>
          <DropdownMenuItem
            className={itemClass}
            disabled={!store}
            onClick={() =>
              window.open(menuUrl(), "_blank", "noopener")
            }
          >
            <ExternalLink />
            Ver cardápio público
          </DropdownMenuItem>
          <DropdownMenuItem
            className={itemClass}
            disabled={!store}
            onClick={copyMenuLink}
          >
            <Copy />
            Copiar link do cardápio
          </DropdownMenuItem>
        </div>

        <DropdownMenuSeparator className="my-0" />

        <div className="p-1.5">
          {/* Sem ação até o login entrar (T17). */}
          <DropdownMenuItem className={itemClass} disabled>
            <LogOut />
            Sair
          </DropdownMenuItem>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// Host público, calculado depois de montar para refletir a origem atual.
function PublicHost({ slug }: { slug: string }) {
  const host = useSyncExternalStore(
    subscribeToNothing,
    () =>
      publicStoreUrl(slug, window.location.origin).replace(
        /^https?:\/\//,
        "",
      ),
    () => null,
  );

  return (
    <p className="truncate text-[13px] text-muted-foreground">
      {host}
    </p>
  );
}

// A origem não muda durante a vida da página; nada a assinar.
function subscribeToNothing() {
  return () => {};
}
