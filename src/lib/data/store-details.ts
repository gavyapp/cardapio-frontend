// Dados da loja para a tela de configurações do painel. Só leitura por
// enquanto; a gravação entra quando for decidido onde cada campo mora.
import "server-only";

import type { Enums } from "@/lib/database.types";
import { createServerSupabase } from "@/lib/supabase/server";

import {
  readStoreRules,
  type StoreRules,
  type StoreSettings,
} from "./store-settings";

export type StoreDetails = {
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
  rules: StoreRules;
};

/** Cadastro e regras da loja, pelo id. Passa pelo RLS do usuário logado. */
export async function findStoreDetails(
  storeId: string,
): Promise<StoreDetails | null> {
  const supabase = await createServerSupabase();
  const { data, error } = await supabase
    .from("stores")
    .select(
      "id, slug, name, phone, street, number, district, city, state, settings",
    )
    .eq("id", storeId)
    .is("deleted_at", null)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  return {
    id: data.id,
    slug: data.slug,
    name: data.name,
    phone: data.phone,
    address: {
      street: data.street,
      number: data.number,
      district: data.district,
      city: data.city,
      state: data.state,
    },
    rules: readStoreRules(data.settings),
  };
}

export type StoreShift = {
  id: string;
  /** 0 = domingo … 6 = sábado, como em store_hours.weekday. */
  weekday: number;
  opensAt: string;
  closesAt: string;
};

/** Turnos de funcionamento da loja, em ordem de dia e hora. */
export async function listStoreHours(
  storeId: string,
): Promise<StoreShift[]> {
  const supabase = await createServerSupabase();
  const { data, error } = await supabase
    .from("store_hours")
    .select("id, weekday, opens_at, closes_at")
    .eq("store_id", storeId)
    .is("deleted_at", null)
    .order("weekday")
    .order("opens_at");

  if (error) throw error;

  return (data ?? []).map((shift) => ({
    id: shift.id,
    weekday: shift.weekday,
    opensAt: shift.opens_at,
    closesAt: shift.closes_at,
  }));
}

export type PaymentMethod = Enums<"payment_method">;

export type ShiftInput = {
  /** Id do turno existente; sem id, é um turno novo. */
  id?: string;
  weekday: number;
  opensAt: string; // "HH:MM"
  closesAt: string; // "HH:MM"
};

/**
 * Salva os turnos da loja no lugar: atualiza os que têm id, insere os novos
 * e marca como excluídos só os que saíram da lista. Passa pelo RLS.
 */
export async function saveStoreHours(
  storeId: string,
  shifts: readonly ShiftInput[],
): Promise<void> {
  const supabase = await createServerSupabase();

  const { data: current, error: listError } = await supabase
    .from("store_hours")
    .select("id")
    .eq("store_id", storeId)
    .is("deleted_at", null);
  if (listError) throw listError;

  const keptIds = new Set(
    shifts.map((shift) => shift.id).filter(Boolean),
  );
  const removedIds = (current ?? [])
    .map((row) => row.id)
    .filter((id) => !keptIds.has(id));

  if (removedIds.length) {
    const { error } = await supabase
      .from("store_hours")
      .update({ deleted_at: new Date().toISOString() })
      .eq("store_id", storeId)
      .in("id", removedIds);
    if (error) throw error;
  }

  for (const shift of shifts) {
    if (!shift.id) continue;
    const { error } = await supabase
      .from("store_hours")
      .update({
        weekday: shift.weekday,
        opens_at: shift.opensAt,
        closes_at: shift.closesAt,
      })
      .eq("id", shift.id)
      .eq("store_id", storeId)
      .is("deleted_at", null);
    if (error) throw error;
  }

  const created = shifts.filter((shift) => !shift.id);
  if (created.length) {
    const { error } = await supabase
      .from("store_hours")
      .insert(
        created.map((shift) => ({
          store_id: storeId,
          weekday: shift.weekday,
          opens_at: shift.opensAt,
          closes_at: shift.closesAt,
        })),
      );
    if (error) throw error;
  }
}

export type StoreProfileInput = {
  name: string;
  phone: string | null;
  street: string | null;
  number: string | null;
  district: string | null;
  city: string | null;
  state: string | null;
};

/** Atualiza o cadastro da loja (nome, telefone e endereço). Passa pelo RLS. */
export async function updateStoreProfile(
  storeId: string,
  input: StoreProfileInput,
): Promise<void> {
  const supabase = await createServerSupabase();
  const { error } = await supabase
    .from("stores")
    .update(input)
    .eq("id", storeId)
    .is("deleted_at", null);
  if (error) throw error;
}

/**
 * Atualiza chaves de stores.settings sem perder as demais: lê o jsonb atual,
 * aplica o patch e grava. Chave nova entra primeiro no schema (ADR 0003).
 */
export async function updateStoreSettings(
  storeId: string,
  patch: Partial<StoreSettings>,
): Promise<void> {
  const supabase = await createServerSupabase();
  const { data, error } = await supabase
    .from("stores")
    .select("settings")
    .eq("id", storeId)
    .is("deleted_at", null)
    .single();
  if (error) throw error;

  const current =
    data.settings &&
    typeof data.settings === "object" &&
    !Array.isArray(data.settings)
      ? data.settings
      : {};
  const { error: updateError } = await supabase
    .from("stores")
    .update({ settings: { ...current, ...patch } })
    .eq("id", storeId)
    .is("deleted_at", null);
  if (updateError) throw updateError;
}
