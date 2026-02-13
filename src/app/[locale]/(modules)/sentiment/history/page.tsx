import { Header } from "@/components/layout/header";
import { SentimentHistoryTable } from "@/modules/sentiment/ui/sentiment-history-table";
import { getTeamMoods, getDepartments } from "@/modules/sentiment/actions/sentiment";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { Button } from "@/modules/shared/ui/button";
import { Link } from "@/i18n/navigation";
import { Plus } from "lucide-react";
import { requirePermission, hasPermission } from "@/lib/actions/rbac";

export default async function SentimentHistoryPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  setRequestLocale(locale)
  
  await requirePermission('sentiment', 'read');
  const canCreate = await hasPermission('sentiment', 'create');

  const [{ data: moods }, departments] = await Promise.all([
    getTeamMoods(),
    getDepartments()
  ]);

  const t = await getTranslations("sentiment");

  return (
    <div className="flex flex-col min-h-screen">
      <Header 
        titleKey="sentiment.historyTitle" 
        descriptionKey="sentiment.historyDescription" 
      >
        {canCreate && (
            <Button size="sm" asChild>
              <Link href="?new-checkin=true">
                <Plus className="mr-2 h-4 w-4" />
                <span className="hidden md:inline">{t("newCheckIn")}</span>
                <span className="md:hidden">{t("new")}</span>
              </Link>
            </Button>
        )}
      </Header>

      <div className="flex-1 p-4 md:p-6 space-y-6">
        <SentimentHistoryTable 
          moods={moods ?? []} 
          departments={departments} 
        />
      </div>
    </div>
  );
}
