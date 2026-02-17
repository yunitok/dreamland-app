import { Header } from "@/components/layout/header";
import { SentimentCheckInForm } from "@/modules/sentiment/ui/sentiment-check-in-form";
import { getDepartments } from "@/modules/sentiment/actions/sentiment";
import { requirePermission } from "@/lib/actions/rbac";

export default async function NewSentimentPage() {
  await requirePermission('sentiment', 'create');

  const departments = await getDepartments();

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      <Header
        titleKey="sentiment.newCheckInTitle"
        descriptionKey="sentiment.newCheckInDescription"
        backHref="/sentiment"
      />
      <div className="flex-1 overflow-y-auto p-4 md:p-6">
        <div className="max-w-3xl mx-auto w-full">
          <SentimentCheckInForm departments={departments} />
        </div>
      </div>
    </div>
  );
}
