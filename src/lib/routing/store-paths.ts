// Caminhos das páginas da loja, a partir do endereço que o navegador mostra.
// No subdomínio o cardápio é "/" e o checkout "/checkout"; pelo caminho,
// "/<slug>" e "/<slug>/checkout". Por isso partem sempre do caminho atual.

const CHECKOUT_SEGMENT = "checkout";
const ORDER_SEGMENT = "pedido";

const withoutTrailingSlash = (pathname: string) =>
  pathname.replace(/\/+$/, "");

// Fim do caminho nas páginas que ficam abaixo do cardápio.
const SUBPAGE = new RegExp(
  `/(?:${CHECKOUT_SEGMENT}|${ORDER_SEGMENT}/[^/]+)$`,
);

/** Do checkout ou da tela do pedido de volta para o cardápio. */
export function menuPathFrom(pathname: string): string {
  return (
    withoutTrailingSlash(pathname).replace(SUBPAGE, "") ||
    "/"
  );
}

/** Do cardápio para o checkout. */
export function checkoutPathFrom(menuPath: string): string {
  return `${withoutTrailingSlash(menuPath)}/${CHECKOUT_SEGMENT}`;
}

/** Do checkout para a tela do pedido enviado. */
export function orderPathFrom(
  checkoutPath: string,
  token: string,
): string {
  const menuPath = menuPathFrom(checkoutPath);
  return `${menuPath === "/" ? "" : menuPath}/${ORDER_SEGMENT}/${token}`;
}
