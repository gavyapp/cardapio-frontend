import type { Metadata } from "next";
import { Archivo, Figtree } from "next/font/google";
import "./globals.css";

// Archivo: painel do lojista. Figtree: cardápio do cliente (fonte
// "Moderna" do protótipo). As duas entram aqui para o layout da loja
// trocar só a variável --font-sans, sem carregar fonte por rota.
const archivo = Archivo({
  variable: "--font-archivo",
  subsets: ["latin"],
});

const figtree = Figtree({
  variable: "--font-figtree",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "Cardápio digital",
    template: "%s · Cardápio digital",
  },
  description:
    "Cardápio digital com pedidos pelo celular e painel para a loja.",
};

export default function RootLayout({
  children,
}: LayoutProps<"/">) {
  return (
    <html
      lang="pt-BR"
      className={`${archivo.variable} ${figtree.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
        {children}
      </body>
    </html>
  );
}
