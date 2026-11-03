"use server";

import { redirect } from "next/navigation";

import { signOutOfPanel } from "@/lib/data/panel-auth";
import { LOGIN_ROUTE } from "@/lib/panel-access";

export async function signOut() {
  await signOutOfPanel();
  redirect(LOGIN_ROUTE);
}
