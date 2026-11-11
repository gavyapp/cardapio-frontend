// Cardápio público de uma loja: tudo o que a tela do cliente mostra.
//
// O conteúdo (loja, horários, categorias, produtos e complementos) fica em
// cache por loja, marcado com menuCacheTag; o painel expira essa marca a
// cada alteração (afterMenuChange). O status aberta ou fechada depende da
// hora, então é calculado a cada acesso, fora do cache.
import "server-only";

import { cacheLife, cacheTag } from "next/cache";
import { cache } from "react";

import { menuCacheTag } from "@/lib/catalog/menu-cache";
import {
  localMoment,
  resolveStoreStatus,
  type Shift,
  type StoreStatus,
} from "@/lib/store/opening";
import type { StoreAppearance } from "@/lib/store/theme";
import { createAnonymousSupabase } from "@/lib/supabase/anonymous";

import {
  readStoreAppearance,
  readStoreRules,
  type StoreRules,
} from "./store-settings";

export type MenuComplement = {
  id: string;
  name: string;
  price: number;
  /** false = esgotado: aparece, mas não pode ser escolhido. */
  isAvailable: boolean;
};

export type MenuComplementGroup = {
  id: string;
  name: string;
  minSelect: number;
  maxSelect: number;
  allowRepeat: boolean;
  options: MenuComplement[];
};

export type MenuProduct = {
  id: string;
  name: string;
  description: string | null;
  price: number;
  imageUrl: string | null;
  badges: string[];
  /** false = esgotado: aparece, mas não pode ser pedido. */
  isAvailable: boolean;
  isSuggested: boolean;
  complementGroups: MenuComplementGroup[];
};

export type MenuCategory = {
  id: string;
  name: string;
  products: MenuProduct[];
};

export type MenuStore = {
  id: string;
  slug: string;
  name: string;
  phone: string | null;
  address: {
    street: string | null;
    number: string | null;
    district: string | null;
    city: string | null;
    state: string | null;
  };
  appearance: StoreAppearance;
  rules: StoreRules;
};

/** A parte do cardápio que não depende da hora. */
export type MenuContent = {
  store: MenuStore;
  /** Botão manual da loja: null segue o horário. */
  openOverride: boolean | null;
  hours: Shift[];
  categories: MenuCategory[];
};

export type Menu = Omit<MenuContent, "openOverride"> & {
  status: StoreStatus;
  /** Dia da semana de agora no fuso da loja (0 = domingo). */
  todayWeekday: number;
};

/**
 * Cardápio da loja pelo slug, com o status de agora. Null se a loja não
 * existe, está inativa ou foi excluída. Layout, página e metadados da mesma
 * requisição compartilham uma chamada só.
 */
export const findMenu = cache(async function findMenu(
  slug: string,
): Promise<Menu | null> {
  const content = await findMenuContent(slug);
  if (!content) return null;

  const supabase = createAnonymousSupabase();
  const { data: isOpen, error } = await supabase.rpc(
    "is_store_open",
    {
      p_store_id: content.store.id,
    },
  );
  if (error) throw error;

  // Só depois da consulta acima: ler a hora antes de um dado sem cache
  // impede o Next de pré-renderizar a página.
  const now = new Date();

  const { openOverride, ...rest } = content;
  return {
    ...rest,
    status: resolveStoreStatus({
      isOpen: Boolean(isOpen),
      override: openOverride,
      shifts: content.hours,
      now,
    }),
    todayWeekday: localMoment(now).weekday,
  };
});

/**
 * Conteúdo do cardápio, em cache por loja. Só itens visíveis: sem excluídos
 * e sem categorias desligadas. Produto e complemento indisponíveis vêm
 * marcados como esgotados, não somem.
 */
async function findMenuContent(
  slug: string,
): Promise<MenuContent | null> {
  "use cache";

  const supabase = createAnonymousSupabase();

  const { data: store, error: storeError } = await supabase
    .from("stores")
    .select(
      "id, slug, name, phone, street, number, district, city, state, settings, is_open_override",
    )
    .eq("slug", slug)
    .eq("active", true)
    .is("deleted_at", null)
    .maybeSingle();
  if (storeError) throw storeError;

  if (!store) {
    // Sem loja não há marca para expirar: guarda por pouco tempo, para um
    // slug recém-criado não ficar dando 404.
    cacheLife("minutes");
    return null;
  }

  cacheTag(menuCacheTag(store.id));

  const [
    hours,
    categories,
    products,
    links,
    groups,
    options,
  ] = await Promise.all([
    supabase
      .from("store_hours")
      .select("weekday, opens_at, closes_at")
      .eq("store_id", store.id)
      .is("deleted_at", null)
      .order("weekday")
      .order("opens_at"),
    supabase
      .from("categories")
      .select("id, name")
      .eq("store_id", store.id)
      .eq("is_available", true)
      .is("deleted_at", null)
      .order("sort_order")
      .order("name"),
    supabase
      .from("products")
      .select(
        "id, category_id, name, description, price, image_url, badges, is_available, is_suggested",
      )
      .eq("store_id", store.id)
      .is("deleted_at", null)
      .order("sort_order")
      .order("name"),
    supabase
      .from("product_complement_groups")
      .select("product_id, complement_group_id")
      .eq("store_id", store.id)
      .order("sort_order"),
    supabase
      .from("complement_groups")
      .select(
        "id, name, min_select, max_select, allow_repeat",
      )
      .eq("store_id", store.id)
      .is("deleted_at", null),
    supabase
      .from("complements")
      .select(
        "id, complement_group_id, name, price, is_available",
      )
      .eq("store_id", store.id)
      .is("deleted_at", null)
      .order("sort_order")
      .order("name"),
  ]);

  for (const result of [
    hours,
    categories,
    products,
    links,
    groups,
    options,
  ]) {
    if (result.error) throw result.error;
  }

  const optionsByGroup = new Map<
    string,
    MenuComplement[]
  >();
  for (const option of options.data ?? []) {
    const list =
      optionsByGroup.get(option.complement_group_id) ?? [];
    list.push({
      id: option.id,
      name: option.name,
      price: option.price,
      isAvailable: option.is_available,
    });
    optionsByGroup.set(option.complement_group_id, list);
  }

  const groupsById = new Map<string, MenuComplementGroup>();
  for (const group of groups.data ?? []) {
    groupsById.set(group.id, {
      id: group.id,
      name: group.name,
      minSelect: group.min_select,
      maxSelect: group.max_select,
      allowRepeat: group.allow_repeat,
      options: optionsByGroup.get(group.id) ?? [],
    });
  }

  // Já na ordem de sort_order do vínculo; grupo excluído fica de fora.
  const groupsByProduct = new Map<
    string,
    MenuComplementGroup[]
  >();
  for (const link of links.data ?? []) {
    const group = groupsById.get(link.complement_group_id);
    if (!group) continue;
    const list = groupsByProduct.get(link.product_id) ?? [];
    list.push(group);
    groupsByProduct.set(link.product_id, list);
  }

  const productsByCategory = new Map<
    string,
    MenuProduct[]
  >();
  for (const product of products.data ?? []) {
    const list =
      productsByCategory.get(product.category_id) ?? [];
    list.push({
      id: product.id,
      name: product.name,
      description: product.description,
      price: product.price,
      imageUrl: product.image_url,
      badges: product.badges,
      isAvailable: product.is_available,
      isSuggested: product.is_suggested,
      complementGroups:
        groupsByProduct.get(product.id) ?? [],
    });
    productsByCategory.set(product.category_id, list);
  }

  return {
    store: {
      id: store.id,
      slug: store.slug,
      name: store.name,
      phone: store.phone,
      address: {
        street: store.street,
        number: store.number,
        district: store.district,
        city: store.city,
        state: store.state,
      },
      appearance: readStoreAppearance(store.settings),
      rules: readStoreRules(store.settings),
    },
    openOverride: store.is_open_override,
    hours: (hours.data ?? []).map((shift) => ({
      weekday: shift.weekday,
      opensAt: shift.opens_at,
      closesAt: shift.closes_at,
    })),
    // Produto de categoria desligada ou excluída some junto com ela.
    categories: (categories.data ?? []).map((category) => ({
      id: category.id,
      name: category.name,
      products: productsByCategory.get(category.id) ?? [],
    })),
  };
}
