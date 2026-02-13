
import { Header } from "@/components/layout/header";
import { SentimentCheckInForm } from "@/modules/admin/ui/sentiment/sentiment-check-in-form";
import { getDepartments } from "@/modules/admin/actions/sentiment";

export default async function NewSentimentPage() {
  const departments = await getDepartments();

  return (
    <div className="flex flex-col space-y-6 max-w-3xl mx-auto w-full">
        <Header 
            titleKey="sentiment.newCheckInTitle" 
            descriptionKey="sentiment.newCheckInDescription" 
        />
        <SentimentCheckInForm departments={departments} />
    </div>
  );
}
