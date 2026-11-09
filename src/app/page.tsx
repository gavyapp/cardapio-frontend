import { redirect } from "next/navigation";

import { PANEL_PATH } from "@/lib/routing/subdomain";

// O domínio raiz ainda não tem página própria da plataforma: leva ao painel,
// que pede login a quem não entrou.
export default function RootPage() {
  redirect(PANEL_PATH);
}
