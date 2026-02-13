import { Header } from "@/components/layout/header";
import { SentimentCheckInForm } from "@/modules/sentiment/ui/sentiment-check-in-form";
import { getTeamMoodById } from "@/modules/sentiment/actions/sentiment";
import { getDepartments } from "@/modules/departments/actions/departments";
import { notFound } from "next/navigation";

export default async function EditSentimentPage({
    params,
  }: {
    params: Promise<{ id: string }>
  }) {
    const { id } = await params;
    
    // Fetch departments and mood
    const [departmentsData, { data: mood }] = await Promise.all([
        getDepartments(),
        getTeamMoodById(id)
    ]);
    
    const departmentNames = departmentsData.map(d => d.departmentName);

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
            departments={departmentNames} 
            initialData={{
                ...mood,
                keyConcerns: mood.keyConcerns || undefined
            }} 
        />
    </div>
  );
}
