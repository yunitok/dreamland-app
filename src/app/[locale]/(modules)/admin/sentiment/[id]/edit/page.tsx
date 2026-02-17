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
    <div className="flex flex-col h-screen overflow-hidden">
      <Header
        titleKey="Editar Check-in"
        descriptionKey="Modifica un registro existente"
        backHref="/admin/sentiment/history"
      />
      <div className="flex-1 overflow-y-auto p-4 md:p-6">
        <div className="max-w-3xl mx-auto w-full">
          <SentimentCheckInForm
            departments={departmentNames}
            initialData={{
              id: mood.id,
              departmentName: mood.departmentName as string,
              sentimentScore: mood.sentimentScore as number,
              dominantEmotion: mood.dominantEmotion as string,
              detectedAt: mood.detectedAt as Date,
              keyConcerns: mood.keyConcerns || undefined
            } as any}
          />
        </div>
      </div>
    </div>
  );
}
