import { getTranslations } from "next-intl/server";
import { Plus, Filter } from "lucide-react";
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
import { getIngredients } from "@/modules/sherlock/actions/ingredients";
import { getCategories } from "@/modules/sherlock/actions/settings";
import { Link } from "@/i18n/navigation";
import { Header } from "@/components/layout/header";

export default async function SherlockIngredientsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const t = await getTranslations("sherlock.ingredients");
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
        titleKey="sherlock.ingredients.title"
        descriptionKey="sherlock.ingredients.description"
        backHref="/sherlock"
      >
        <div className="flex items-center gap-2">
          <Button size="sm" asChild className="h-8 sm:h-9">
            <Link href="/sherlock/ingredients/new">
              <Plus className="sm:mr-2 h-4 w-4" />
              <span className="hidden sm:inline">{t("new")}</span>
              <span className="sm:hidden text-xs">Nuevo</span>
            </Link>
          </Button>
        </div>
      </Header>

      <div className="flex-1 p-6 overflow-y-auto">
        <div className="flex flex-col gap-6">

          <div className="flex items-center gap-4 bg-background/50 p-4 rounded-lg border">
            <div className="relative flex-1 max-w-sm">
              <Filter className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nombre..."
                className="pl-9"
                defaultValue={search}
                name="search"
              />
            </div>
            <Select defaultValue={categoryId}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Filtrar por categoría" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
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
