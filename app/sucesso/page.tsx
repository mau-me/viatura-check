import { CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function SucessoPage({
  searchParams,
}: {
  searchParams: { id?: string };
}) {
  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center gap-4 p-4 text-center">
      <CheckCircle2 className="h-16 w-16 text-green-600" />
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="text-xl">Registro salvo!</CardTitle>
          <CardDescription>
            A carga de viatura foi registrada com sucesso.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          {searchParams.id && (
            <p>
              Identificador do registro:{" "}
              <span className="font-mono font-medium text-foreground">{searchParams.id}</span>
            </p>
          )}
        </CardContent>
      </Card>
      <div className="flex w-full flex-col gap-2">
        <Button render={<Link href="/" />} size="lg">
          Nova Carga
        </Button>
        <Button render={<Link href="/admin" />} variant="outline">
          Ver registros (admin)
        </Button>
      </div>
    </div>
  );
}