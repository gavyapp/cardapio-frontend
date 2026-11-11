import { MenuCategoryNav } from "@/components/organisms/menu-category-nav";
import { MenuFooter } from "@/components/organisms/menu-footer";
import { MenuHero } from "@/components/organisms/menu-hero";
import { MenuProductList } from "@/components/organisms/menu-product-list";
import { MobileCart } from "@/components/organisms/mobile-cart";
import { OrderSummary } from "@/components/organisms/order-summary";
import { ProductDetail } from "@/components/organisms/product-detail";
import { StoreInfoDialog } from "@/components/organisms/store-info-dialog";
import { CartProvider } from "@/components/providers/cart-provider";
import { MenuSearchProvider } from "@/components/providers/menu-search-provider";
import { menuSectionId } from "@/lib/catalog/menu-sections";
import type { Menu } from "@/lib/data/menu";
import { formatCurrency } from "@/lib/format";
import {
  deliveryRows,
  formatFullAddress,
  mapUrlFor,
  phoneLinksFor,
  weekHours,
} from "@/lib/store/public-info";

const HERO_ID = "topo-do-cardapio";

/**
 * Cardápio público da loja: topo, avisos, abas de categoria fixas e os
 * produtos, com o detalhe do produto e o carrinho. No computador, o cupom
 * do pedido fica ao lado; no celular, numa barra no pé da tela.
 */
export function MenuTemplate({ menu }: { menu: Menu }) {
  const { store, status } = menu;
  const { appearance, rules } = store;
  // Categoria sem produto não aparece nem nas abas.
  const categories = menu.categories.filter(
    (category) => category.products.length > 0,
  );
  const address = formatFullAddress(store.address);

  return (
    <CartProvider
      storeId={store.id}
      products={categories.flatMap(
        (category) => category.products,
      )}
      rules={{
        minimumOrder: rules.minimumOrder,
        freeDeliveryAbove: rules.freeDeliveryAbove,
      }}
      canOrder={status.isOpen}
      nextOpeningLabel={status.nextOpeningLabel}
    >
      <MenuSearchProvider>
        <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-4 lg:px-8">
          <MenuHero
            id={HERO_ID}
            store={{
              name: store.name,
              logoUrl: appearance.logoUrl,
              coverUrl: appearance.coverUrl,
              primaryColor: appearance.primaryColor,
            }}
            status={status}
            info={
              <StoreInfoDialog
                storeName={store.name}
                address={address}
                mapUrl={mapUrlFor(store.address)}
                phone={phoneLinksFor(store.phone)}
                week={weekHours(
                  menu.hours,
                  menu.todayWeekday,
                )}
                delivery={deliveryRows(rules)}
              />
            }
          />

          <div className="grid flex-1 items-start gap-x-8 lg:grid-cols-[minmax(0,1fr)_320px]">
            <div className="flex min-w-0 flex-col">
              <div className="flex flex-col gap-2 py-4">
                {status.isOpen ? null : (
                  <p
                    role="status"
                    className="rounded-control border bg-muted px-4 py-3 text-body font-semibold"
                  >
                    Loja fechada
                    {status.nextOpeningLabel
                      ? `: ${status.nextOpeningLabel}.`
                      : " no momento."}{" "}
                    <span className="font-normal text-muted-foreground">
                      Você pode ver o cardápio, mas não dá
                      para pedir agora.
                    </span>
                  </p>
                )}
                {appearance.welcome ? (
                  <p className="rounded-control bg-muted px-4 py-3 text-body">
                    {appearance.welcome}
                  </p>
                ) : null}
                {rules.freeDeliveryAbove !== null ? (
                  <p className="rounded-control bg-primary-soft px-4 py-3 text-body font-semibold text-primary-soft-foreground">
                    Entrega grátis em pedidos acima de{" "}
                    {formatCurrency(
                      rules.freeDeliveryAbove,
                    )}
                  </p>
                ) : null}
              </div>

              <MenuCategoryNav
                store={{
                  name: store.name,
                  logoUrl: appearance.logoUrl,
                  primaryColor: appearance.primaryColor,
                }}
                categories={categories.map(
                  ({ id, name }) => ({
                    id,
                    name,
                  }),
                )}
                heroId={HERO_ID}
              />

              <main className="flex flex-col gap-8 pt-6">
                {categories.length === 0 ? (
                  <p className="py-12 text-center text-body text-muted-foreground">
                    Esta loja ainda não tem produtos no
                    cardápio.
                  </p>
                ) : null}
                {categories.map((category) => (
                  <section
                    key={category.id}
                    id={menuSectionId(category.id)}
                    aria-labelledby={`${menuSectionId(category.id)}-titulo`}
                    className="flex flex-col gap-3"
                  >
                    <h2
                      id={`${menuSectionId(category.id)}-titulo`}
                      className="text-section-title font-semibold"
                    >
                      {category.name}
                    </h2>
                    <MenuProductList
                      layout={appearance.layout}
                      products={category.products.map(
                        (product) => ({
                          id: product.id,
                          name: product.name,
                          description: product.description,
                          price: product.price,
                          imageUrl: product.imageUrl,
                          badges: product.badges,
                          isAvailable: product.isAvailable,
                        }),
                      )}
                    />
                  </section>
                ))}
              </main>

              <MenuFooter
                storeName={store.name}
                address={address}
              />
            </div>

            <aside className="sticky top-4 hidden py-4 lg:block">
              <OrderSummary storeName={store.name} />
            </aside>
          </div>

          <MobileCart />
        </div>

        <ProductDetail />
      </MenuSearchProvider>
    </CartProvider>
  );
}
