import { getTranslations } from "next-intl/server";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/modules/shared/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/modules/shared/ui/card";
import { getMeasureUnits, getCategories, getSuppliers } from "@/modules/gastrolab/actions/settings";
import { getGstockSyncInfo } from "@/modules/gastrolab/actions/gstock-sync";
import { getAgoraLastSync, getAgoraProductStats } from "@/modules/analytics/actions/agora-sync";
import { UnitsTable } from "./_components/units-table";
import { CategoriesList } from "./_components/categories-list";
import { SuppliersTable } from "./_components/suppliers-table";
import { CreateUnitDialog } from "./_components/create-unit-dialog";
import { CreateCategoryDialog } from "./_components/create-category-dialog";
import { CreateSupplierDialog } from "./_components/create-supplier-dialog";
import { GstockSyncCard } from "./_components/gstock-sync-card";
import { AgoraSyncCard } from "./_components/agora-sync-card";
import { Header } from "@/components/layout/header";
import { getSession } from "@/lib/auth";
import { getRestaurantLocations } from "@/modules/analytics/actions/cover-analytics";
import { QrGeneratorDialog } from "@/modules/walk-in/ui/qr-generator-dialog";

export default async function GastrolabSettingsPage() {
  const t = await getTranslations("gastrolab.settings");

  // Fetch data in parallel
  const [units, categories, suppliers, syncInfo, session, locations, agoraLastSync, agoraStats] = await Promise.all([
    getMeasureUnits(),
    getCategories(),
    getSuppliers(),
    getGstockSyncInfo(),
    getSession(),
    getRestaurantLocations(),
    getAgoraLastSync(),
    getAgoraProductStats(),
  ]);

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      <Header
        titleKey="gastrolab.settings.title"
        descriptionKey="gastrolab.settings.description"
        backHref="/gastrolab"
      />

      <div className="flex-1 p-6 overflow-y-auto">
        <div className="flex flex-col gap-6 max-w-7xl mx-auto">

          {/* Card de sincronización GStock */}
          <GstockSyncCard
            lastSync={syncInfo.lastSync}
            totalEntries={syncInfo.totalEntries}
            isSuperAdmin={session?.user?.role === "SUPER_ADMIN"}
          />

          {/* Card de sincronización Agora TPV */}
          <AgoraSyncCard
            lastSync={agoraLastSync}
            stats={agoraStats}
            isSuperAdmin={session?.user?.role === "SUPER_ADMIN"}
          />

          {/* Walk-in QR Generator */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <div className="space-y-1">
                <CardTitle>Walk-in QR</CardTitle>
                <CardDescription>Genera códigos QR para que los clientes consulten disponibilidad en tiempo real.</CardDescription>
              </div>
              <QrGeneratorDialog
                restaurants={locations.filter((l): l is typeof l & { cmSlug: string; walkInToken: string | null } => l.cmSlug !== null)}
              />
            </CardHeader>
          </Card>

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
