import { LogOut } from "lucide-react";

import { Button } from "@/components/atoms/button";
import {
  Card,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/atoms/card";

// Aviso para quem entrou mas ainda não tem loja vinculada.
export function NoStoreNotice({
  email,
  signOutAction,
}: {
  email: string;
  signOutAction: () => Promise<void>;
}) {
  return (
    <div className="mx-auto w-full max-w-lg p-4 sm:p-6">
      <Card>
        <CardHeader>
          <CardTitle>Nenhuma loja vinculada</CardTitle>
          <CardDescription>
            A conta {email} ainda não tem acesso a nenhuma
            loja. Fale com a equipe do cardápio para liberar
            o acesso.
          </CardDescription>
        </CardHeader>
        <CardFooter>
          <form action={signOutAction}>
            <Button type="submit" variant="outline">
              <LogOut data-icon="inline-start" />
              Sair
            </Button>
          </form>
        </CardFooter>
      </Card>
    </div>
  );
}
