import { CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function SucessoPage({
  searchParams,
}: {
  searchParams: { id?: string; phase?: string };
}) {
  const isReturn = searchParams.phase === "return";

  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center gap-4 p-4 text-center">
      <CheckCircle2 className="h-16 w-16 text-green-600" />
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="text-xl">
            {isReturn ? "Devolução registrada!" : "Carga registrada!"}
          </CardTitle>
          <CardDescription>
            {isReturn
              ? "A devolução da viatura foi registrada com sucesso."
              : "A carga da viatura foi registrada com sucesso."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          {searchParams.id && (
            <p>
              Identificador:{" "}
              <span className="font-mono font-medium text-foreground">{searchParams.id}</span>
            </p>
          )}
          {!isReturn && (
            <p className="text-primary font-medium">
              Não esqueça de registrar a devolução quando retornar a viatura.
            </p>
          )}
        </CardContent>
      </Card>
      <div className="flex w-full flex-col gap-2">
        <Button render={<Link href="/" />} size="lg">
          {isReturn ? "Voltar ao Dashboard" : "Ver Viatura em Aberto"}
        </Button>
      </div>
    </div>
  );
}
