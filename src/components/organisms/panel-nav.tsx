"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  BookOpen,
  ChevronDown,
  ClipboardList,
  LayoutGrid,
  Tag,
} from "lucide-react";

import type { CatalogCounts } from "@/lib/data/catalog-counts";
import { cn } from "@/lib/utils";
import { CountChip } from "@/components/atoms/count-chip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/atoms/dropdown-menu";
import { useLiveOrdersContext } from "@/components/providers/live-orders-provider";

const MENU_ITEMS = [
  {
    label: "Produtos",
    href: "/painel/cardapio/produtos",
    count: (counts: CatalogCounts) => counts.products,
  },
  {
    label: "Complementos",
    href: "/painel/cardapio/complementos",
    count: (counts: CatalogCounts) =>
      counts.complementGroups,
  },
];

const tabClass =
  "relative flex h-12 shrink-0 items-center gap-2 px-1 text-body text-muted-foreground transition-colors hover:text-foreground data-[active=true]:font-semibold data-[active=true]:text-foreground data-[active=true]:after:absolute data-[active=true]:after:inset-x-0 data-[active=true]:after:-bottom-px data-[active=true]:after:h-0.5 data-[active=true]:after:bg-foreground [&_svg]:size-4.5";

function isActive(pathname: string, href: string) {
  return (
    pathname === href || pathname.startsWith(`${href}/`)
  );
}

export function PanelNav({
  catalogCounts,
}: {
  catalogCounts?: CatalogCounts;
}) {
  const pathname = usePathname();
  const live = useLiveOrdersContext();
  const newOrders = live?.newCount ?? 0;
  const unseenOrders = live?.unseenCount ?? 0;
  const { listRef, hidden, updateHidden } =
    useOverflowHint(pathname);

  return (
    <nav
      aria-label="Seções do painel"
      className="border-b border-border"
    >
      <ul
        ref={listRef}
        onScroll={updateHidden}
        data-hidden-start={hidden.start || undefined}
        data-hidden-end={hidden.end || undefined}
        className="flex scroll-px-4 [scrollbar-width:none] gap-6 overflow-x-auto px-4 data-hidden-end:mask-r-from-85% data-hidden-start:mask-l-from-85% sm:scroll-px-6 sm:px-6"
      >
        <li>
          <Link
            href="/painel/pedidos"
            data-active={isActive(
              pathname,
              "/painel/pedidos",
            )}
            className={tabClass}
          >
            <ClipboardList />
            Pedidos
            {newOrders > 0 ? (
              <CountChip
                count={newOrders}
                hot
                pulse={unseenOrders > 0}
                label="novos"
              />
            ) : null}
          </Link>
        </li>
        <li>
          <DropdownMenu>
            <DropdownMenuTrigger
              data-active={isActive(
                pathname,
                "/painel/cardapio",
              )}
              className={cn(
                tabClass,
                "group/menu cursor-pointer outline-none",
              )}
            >
              <BookOpen />
              Cardápio
              <ChevronDown className="size-4! text-muted-foreground transition-transform group-data-popup-open/menu:rotate-180" />
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="start"
              className="w-60 px-0 py-1"
            >
              {MENU_ITEMS.map((item) => {
                const current = isActive(
                  pathname,
                  item.href,
                );
                return (
                  <DropdownMenuItem
                    key={item.href}
                    render={<Link href={item.href} />}
                    aria-current={
                      current ? "page" : undefined
                    }
                    className={cn(
                      "h-11 cursor-pointer gap-3 rounded-none px-4 text-body",
                      current && "bg-muted font-semibold",
                    )}
                  >
                    <span className="flex-1">
                      {item.label}
                    </span>
                    {catalogCounts ? (
                      <span className="tabular text-support font-normal text-muted-foreground">
                        {item.count(catalogCounts)}
                      </span>
                    ) : null}
                  </DropdownMenuItem>
                );
              })}
            </DropdownMenuContent>
          </DropdownMenu>
        </li>
        <li>
          <Link
            href="/painel/promocoes"
            data-active={isActive(
              pathname,
              "/painel/promocoes",
            )}
            className={tabClass}
          >
            <Tag />
            Promoções
          </Link>
        </li>
        <li>
          <Link
            href="/painel/dashboard"
            data-active={isActive(
              pathname,
              "/painel/dashboard",
            )}
            className={tabClass}
          >
            <LayoutGrid />
            Dashboard
          </Link>
        </li>
      </ul>
    </nav>
  );
}

/**
 * No celular as abas não cabem: esmaece a borda do lado onde há aba
 * escondida, para mostrar que a barra rola, e traz a aba atual para a vista.
 */
function useOverflowHint(pathname: string) {
  const listRef = useRef<HTMLUListElement>(null);
  const [hidden, setHidden] = useState({
    start: false,
    end: false,
  });

  function updateHidden() {
    const list = listRef.current;
    if (!list) return;
    const start = list.scrollLeft > 1;
    const end =
      list.scrollLeft + list.clientWidth <
      list.scrollWidth - 1;
    setHidden((current) =>
      current.start === start && current.end === end
        ? current
        : { start, end },
    );
  }

  useEffect(() => {
    const list = listRef.current;
    if (!list) return;
    list
      .querySelector('[data-active="true"]')
      ?.scrollIntoView({
        block: "nearest",
        inline: "nearest",
      });
    updateHidden();
    const observer = new ResizeObserver(updateHidden);
    observer.observe(list);
    return () => observer.disconnect();
  }, [pathname]);

  return { listRef, hidden, updateHidden };
}
