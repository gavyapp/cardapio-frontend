// Resolve o subdomínio da requisição para o caminho interno.
//
//   stack-burguer.gavy.com/      → /stack-burguer
//   painel.gavy.com/pedidos      → /painel/pedidos
//   gavy.com, www.gavy.com       → sem reescrita
//   *.localhost                  → mesma regra, para desenvolvimento
//   qualquer outro host          → sem reescrita (ex.: previews da Vercel)
//
// Puro, sem Next, para ser testável e usado pelo proxy.

export const PANEL_SUBDOMAIN = "painel";
export const PANEL_PATH = "/painel";

/** Subdomínios que não são loja. */
const RESERVED = new Set(["www", PANEL_SUBDOMAIN]);

export function rootDomain(): string {
  return (process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? "")
    .trim()
    .toLowerCase();
}

/** Primeiro rótulo do host quando ele é subdomínio direto de uma das raízes. */
export function subdomainOf(
  host: string,
  roots: string[],
): string | null {
  const hostname = host.toLowerCase().split(":")[0];
  for (const root of roots) {
    if (!root) continue;
    const suffix = `.${root}`;
    if (!hostname.endsWith(suffix)) continue;
    const label = hostname.slice(0, -suffix.length);
    // Só um nível: a.b.gavy.com não é loja.
    if (!label || label.includes(".")) return null;
    return label;
  }
  return null;
}

/** Caminho reescrito para a requisição, ou null quando não há o que reescrever. */
export function rewritePathFor(
  host: string,
  pathname: string,
): string | null {
  const label = subdomainOf(host, [
    rootDomain(),
    "localhost",
  ]);
  if (!label || label === "www") return null;

  if (label === PANEL_SUBDOMAIN) {
    if (
      pathname === PANEL_PATH ||
      pathname.startsWith(`${PANEL_PATH}/`)
    )
      return null;
    return `${PANEL_PATH}${pathname === "/" ? "" : pathname}`;
  }

  if (RESERVED.has(label)) return null;
  const prefix = `/${label}`;
  if (
    pathname === prefix ||
    pathname.startsWith(`${prefix}/`)
  )
    return null;
  return `${prefix}${pathname === "/" ? "" : pathname}`;
}
