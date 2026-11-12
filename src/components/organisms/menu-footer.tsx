import { PLATFORM_NAME } from "@/components/atoms/platform-mark";

/** Rodapé do cardápio: nome e endereço da loja e a plataforma. */
export function MenuFooter({
  storeName,
  address,
}: {
  storeName: string;
  address: string;
}) {
  return (
    <footer className="mt-12 flex flex-col gap-3 border-t py-6 text-caption text-muted-foreground">
      <div className="flex flex-col gap-0.5">
        <span className="font-semibold text-foreground">
          {storeName}
        </span>
        {address ? <span>{address}</span> : null}
      </div>
      <span>
        Plataforma fornecida por{" "}
        <strong className="font-semibold text-foreground">
          {PLATFORM_NAME}
        </strong>
      </span>
    </footer>
  );
}
