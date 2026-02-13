import { Header } from "@/components/layout/header";
import { SentimentCheckInForm } from "@/modules/sentiment/ui/sentiment-check-in-form";
import { getDepartments } from "@/modules/sentiment/actions/sentiment";
import { requirePermission } from "@/lib/actions/rbac";

export default async function NewSentimentPage() {
  await requirePermission('sentiment', 'create');

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
