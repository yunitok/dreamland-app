import { Header } from "@/components/layout/header";
import { SentimentCheckInForm } from "@/modules/sentiment/ui/sentiment-check-in-form";
import { getDepartments } from "@/modules/departments/actions/departments";

export default async function NewSentimentPage() {
  const departmentsData = await getDepartments();
  const departmentNames = departmentsData.map(d => d.departmentName);

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      <Header
        titleKey="sentiment.newCheckInTitle"
        descriptionKey="sentiment.newCheckInDescription"
        backHref="/admin/sentiment"
      />
      <div className="flex-1 overflow-y-auto p-4 md:p-6">
        <div className="max-w-3xl mx-auto w-full">
          <SentimentCheckInForm departments={departmentNames} />
        </div>
      </div>
    </div>
  );
}
