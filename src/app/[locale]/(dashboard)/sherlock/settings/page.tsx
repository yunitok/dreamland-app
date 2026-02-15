import { getTranslations } from "next-intl/server";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/modules/shared/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/modules/shared/ui/card";
import { getMeasureUnits, getCategories, getSuppliers } from "@/modules/sherlock/actions/settings";
import { UnitsTable } from "./_components/units-table";
import { CategoriesList } from "./_components/categories-list";
import { SuppliersTable } from "./_components/suppliers-table";
import { CreateUnitDialog } from "./_components/create-unit-dialog";
import { CreateCategoryDialog } from "./_components/create-category-dialog";
import { CreateSupplierDialog } from "./_components/create-supplier-dialog";
import { Header } from "@/components/layout/header";

export default async function SherlockSettingsPage() {
  const t = await getTranslations("sherlock.settings");

  // Fetch data in parallel
  const [units, categories, suppliers] = await Promise.all([
    getMeasureUnits(),
    getCategories(),
    getSuppliers()
  ]);

  return (
    <div className="flex flex-col h-[calc(100vh-65px)]">
      <Header
        titleKey="sherlock.settings.title"
        descriptionKey="sherlock.settings.description"
        backHref="/sherlock"
      />

      <div className="flex-1 p-6 overflow-auto">
        <div className="flex flex-col gap-6 max-w-7xl mx-auto">

          <Tabs defaultValue="units" className="w-full">
            <TabsList className="grid w-full grid-cols-3 max-w-[600px]">
              <TabsTrigger value="units">Unidades de Medida</TabsTrigger>
              <TabsTrigger value="categories">Categorías</TabsTrigger>
              <TabsTrigger value="suppliers">Proveedores</TabsTrigger>
            </TabsList>

            <TabsContent value="units" className="mt-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <div className="space-y-1">
                    <CardTitle>Unidades de Medida</CardTitle>
                    <CardDescription>Define las unidades para tus recetas e ingredientes.</CardDescription>
                  </div>
                  <CreateUnitDialog />
                </CardHeader>
                <CardContent>
                  <UnitsTable data={units} />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="categories" className="mt-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <div className="space-y-1">
                    <CardTitle>Categorías de Ingredientes</CardTitle>
                    <CardDescription>Organiza tus productos en familias y subfamilias.</CardDescription>
                  </div>
                  <CreateCategoryDialog categories={categories} />
                </CardHeader>
                <CardContent>
                  <CategoriesList data={categories} />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="suppliers" className="mt-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <div className="space-y-1">
                    <CardTitle>Proveedores</CardTitle>
                    <CardDescription>Agenda de proveedores y condiciones comerciales.</CardDescription>
                  </div>
                  <CreateSupplierDialog />
                </CardHeader>
                <CardContent>
                  <SuppliersTable data={suppliers} />
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
