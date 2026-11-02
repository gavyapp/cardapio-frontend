import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function Home() {
  return (
    <main className="flex min-h-screen items-center justify-center p-8">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Cardápio <Badge>shadcn/ui</Badge>
          </CardTitle>
          <CardDescription>
            Projeto Next.js configurado com Tailwind v4 e
            shadcn/ui.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="grid gap-2">
            <Label htmlFor="name">Nome do prato</Label>
            <Input id="name" placeholder="Ex.: Feijoada" />
          </div>
          <Button>Adicionar</Button>
        </CardContent>
      </Card>
    </main>
  );
}
