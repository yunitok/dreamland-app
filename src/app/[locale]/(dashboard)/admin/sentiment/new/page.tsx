
import { Header } from "@/components/layout/header";
import { SentimentCheckInForm } from "@/components/admin/sentiment/sentiment-check-in-form";
import { getDepartments } from "@/lib/actions/sentiment";

export default async function NewSentimentPage() {
  const departments = await getDepartments();

  return (
    <div className="flex flex-col space-y-6 max-w-3xl mx-auto w-full">
        <Header 
            titleKey="Nuevo Check-in" 
            descriptionKey="Registra el pulso emocional de un departamento" 
        />
        <SentimentCheckInForm departments={departments} />
    </div>
  );
}
