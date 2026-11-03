import { LogOut } from "lucide-react";

import { Button } from "@/components/atoms/button";
import { PanelAccessTemplate } from "@/components/templates/panel-access-template";

// Aviso para quem entrou mas ainda não tem loja vinculada.
export function NoStoreNotice({
  email,
  signOutAction,
}: {
  email: string;
  signOutAction: () => Promise<void>;
}) {
  return (
    <PanelAccessTemplate
      title="Nenhuma loja vinculada"
      description={
        <>
          A conta{" "}
          <span className="font-medium break-all text-foreground">
            {email}
          </span>{" "}
          ainda não tem acesso a nenhuma loja. Fale com a
          equipe do cardápio para liberar o acesso.
        </>
      }
    >
      <form action={signOutAction}>
        <Button
          type="submit"
          variant="outline"
          size="lg"
          className="w-full"
        >
          <LogOut data-icon="inline-start" />
          Sair e entrar com outra conta
        </Button>
      </form>
    </PanelAccessTemplate>
  );
}
