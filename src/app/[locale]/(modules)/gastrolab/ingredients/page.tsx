import { getTranslations } from "next-intl/server";
import { Plus, Search } from "lucide-react";
import { Button } from "@/modules/shared/ui/button";
import { Input } from "@/modules/shared/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/modules/shared/ui/select";
import { IngredientsTable } from "./_components/ingredients-table";
import { getIngredients } from "@/modules/gastrolab/actions/ingredients";
import { getCategories } from "@/modules/gastrolab/actions/settings";
import { Link } from "@/i18n/navigation";
import { Header } from "@/components/layout/header";

export default async function GastrolabIngredientsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const t = await getTranslations("gastrolab.ingredients");
  const params = await searchParams;
  const categoryId = params.category as string | undefined;
  const search = params.search as string | undefined;

  const [ingredients, categories] = await Promise.all([
    getIngredients({ categoryId, search }),
    getCategories(),
  ]);

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      <Header
        titleKey="gastrolab.ingredients.title"
        descriptionKey="gastrolab.ingredients.description"
        backHref="/gastrolab"
      >
        <div className="flex items-center gap-2">
          <Button size="sm" asChild className="h-8 sm:h-9">
            <Link href="/gastrolab/ingredients/new">
              <Plus className="sm:mr-2 h-4 w-4" />
              <span className="hidden sm:inline">{t("new")}</span>
              <span className="sm:hidden text-xs">Nuevo</span>
            </Link>
          </Button>
        </div>
      </Header>

      <div className="flex-1 p-6 overflow-y-auto">
        <div className="flex flex-col gap-6">

          <div className="flex flex-wrap items-center gap-3">
            <div className="relative w-full sm:w-auto sm:min-w-[220px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
              <Input
                placeholder={t("searchPlaceholder")}
                className="pl-9"
                defaultValue={search}
                name="search"
              />
            </div>
            <Select defaultValue={categoryId}>
              <SelectTrigger className="w-full sm:w-auto sm:min-w-[150px]">
                <SelectValue placeholder={t("filterByCategory")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("allCategories")}</SelectItem>
                {categories.map((cat) => (
                  <SelectItem key={cat.id} value={cat.id}>
                    {cat.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <IngredientsTable data={ingredients} />
        </div>
      </div>
    </div>
  );
}
