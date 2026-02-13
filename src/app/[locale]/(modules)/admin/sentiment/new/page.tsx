import { Header } from "@/components/layout/header";
import { SentimentCheckInForm } from "@/modules/sentiment/ui/sentiment-check-in-form";
import { getDepartments } from "@/modules/departments/actions/departments";

export default async function NewSentimentPage() {
  const departmentsData = await getDepartments();
  const departmentNames = departmentsData.map(d => d.departmentName);

  return (
    <div className="flex flex-col space-y-6 max-w-3xl mx-auto w-full">
        <Header 
            titleKey="sentiment.newCheckInTitle" 
            descriptionKey="sentiment.newCheckInDescription" 
        />
        <SentimentCheckInForm departments={departmentNames} />
    </div>
  );
}
