// Caminhos das páginas da loja, a partir do endereço que o navegador mostra.
// No subdomínio o cardápio é "/" e o checkout "/checkout"; pelo caminho,
// "/<slug>" e "/<slug>/checkout". Por isso partem sempre do caminho atual.

const CHECKOUT_SEGMENT = "checkout";

const withoutTrailingSlash = (pathname: string) =>
  pathname.replace(/\/+$/, "");

/** Do cardápio para o checkout. */
export function checkoutPathFrom(menuPath: string): string {
  return `${withoutTrailingSlash(menuPath)}/${CHECKOUT_SEGMENT}`;
}

/** Do checkout de volta para o cardápio. */
export function menuPathFrom(checkoutPath: string): string {
  const path = withoutTrailingSlash(checkoutPath);
  const suffix = `/${CHECKOUT_SEGMENT}`;
  const menuPath = path.endsWith(suffix)
    ? path.slice(0, -suffix.length)
    : path;
  return menuPath || "/";
}
