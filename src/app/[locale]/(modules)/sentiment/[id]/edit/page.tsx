import { Header } from "@/components/layout/header";
import { SentimentCheckInForm } from "@/modules/sentiment/ui/sentiment-check-in-form";
import { getDepartments, getTeamMoodById } from "@/modules/sentiment/actions/sentiment";
import { notFound } from "next/navigation";
import { requirePermission } from "@/lib/actions/rbac";

export default async function EditSentimentPage({
    params,
  }: {
    params: Promise<{ id: string }>
  }) {
    const { id } = await params;
    
    await requirePermission('sentiment', 'update');

    const departments = await getDepartments();
    const { data: mood } = await getTeamMoodById(id);

    if (!mood) {
        notFound();
    }

  return (
    <div className="flex flex-col space-y-6 max-w-3xl mx-auto w-full">
        <Header 
            titleKey="Editar Check-in" 
            descriptionKey="Modifica un registro existente" 
        />
        <SentimentCheckInForm 
            departments={departments} 
            initialData={{
                ...mood,
                keyConcerns: mood.keyConcerns || undefined
            }} 
        />
    </div>
  );
}
