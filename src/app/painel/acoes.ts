"use server";

import { redirect } from "next/navigation";

import { sairDoPainel } from "@/lib/data/acesso-ao-painel";
import { rotaDoLogin } from "@/lib/painel/acesso";

export async function sair() {
  await sairDoPainel();
  redirect(rotaDoLogin);
}
