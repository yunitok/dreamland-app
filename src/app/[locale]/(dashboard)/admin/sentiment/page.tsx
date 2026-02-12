
import { Header } from "@/components/layout/header";
import { Button } from "@/modules/shared/ui/button";
import { Plus, Pencil } from "lucide-react";
import Link from "next/link";
import { getTeamMoods } from "@/lib/actions/sentiment";
import { format } from "date-fns";
import { es } from "date-fns/locale";

export default async function SentimentHistoryPage({
    params,
  }: {
    params: Promise<{ locale: string }>
  }) {
    await params;
    const { data: moods } = await getTeamMoods();
  
    const getZoneColor = (score: number) => {
        if (score < 40) return "text-red-500 bg-red-500/10 border-red-500/20";
        if (score < 70) return "text-orange-500 bg-orange-500/10 border-orange-500/20";
        return "text-emerald-500 bg-emerald-500/10 border-emerald-500/20";
    };

    return (
      <div className="flex flex-col space-y-6">
        <div className="flex items-center justify-between">
            <Header 
                titleKey="Historial de Sentimiento" 
                descriptionKey="Seguimiento emocional de los departamentos" 
            />
            <Button asChild>
                <Link href="/admin/sentiment/new">
                    <Plus className="mr-2 h-4 w-4" />
                    Nuevo Check-in
                </Link>
            </Button>
        </div>
  
        <div className="premium-card rounded-xl border bg-card text-card-foreground shadow-sm">
            <div className="relative w-full overflow-auto">
                <table className="w-full caption-bottom text-sm">
                    <thead className="[&_tr]:border-b">
                        <tr className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted">
                            <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Fecha</th>
                            <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Departamento</th>
                            <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Zona</th>
                            <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Emoción</th>
                            <th className="h-12 px-4 text-right align-middle font-medium text-muted-foreground">Acciones</th>
                        </tr>
                    </thead>
                    <tbody className="[&_tr:last-child]:border-0">
                        {moods?.map((mood) => (
                            <tr key={mood.id} className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted">
                                <td className="p-4 align-middle font-medium">
                                    {format(new Date(mood.detectedAt), "d MMM, yyyy", { locale: es })}
                                </td>
                                <td className="p-4 align-middle">{mood.departmentName}</td>
                                <td className="p-4 align-middle">
                                    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 ${getZoneColor(mood.sentimentScore)}`}>
                                        {mood.sentimentScore}
                                    </span>
                                </td>
                                <td className="p-4 align-middle">{mood.dominantEmotion}</td>
                                <td className="p-4 align-middle text-right">
                                    <div className="flex justify-end gap-2">
                                        <Button variant="ghost" size="icon" asChild>
                                            <Link href={`/admin/sentiment/${mood.id}/edit`}>
                                                <Pencil className="h-4 w-4" />
                                            </Link>
                                        </Button>
                                        {/* TODO: Add Delete Dialog */}
                                    </div>
                                </td>
                            </tr>
                        ))}
                        {!moods?.length && (
                            <tr>
                                <td colSpan={5} className="p-4 text-center text-muted-foreground">
                                    No hay registros de sentimiento todavía.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
      </div>
    );
  }
