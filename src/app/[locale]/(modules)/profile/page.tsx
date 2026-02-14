import { redirect } from "next/navigation"
import { getSession } from "@/lib/auth"
import { getTranslations, setRequestLocale } from "next-intl/server"
import { Header } from "@/components/layout/header"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/modules/shared/ui/tabs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/modules/shared/ui/card"
import { ProfileInfoForm } from "@/components/profile/profile-info-form"
import { AvatarUploadSection } from "@/components/profile/avatar-upload-section"
import { ProfileRoleSection } from "@/components/profile/profile-role-section"
import { ChangePasswordForm } from "@/components/auth/change-password-form"
import { User, Lock, Image as ImageIcon, Shield } from "lucide-react"
import { prisma } from "@/lib/prisma"

export default async function ProfilePage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  setRequestLocale(locale)

  const session = await getSession()
  if (!session || !session.user) {
    redirect("/login")
  }

  const t = await getTranslations("profile")
  const tTabs = await getTranslations("profile.tabs")

  // Obtener datos completos del usuario
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: {
      role: {
        include: {
          permissions: true
        }
      }
    }
  })

  if (!user) {
    redirect("/login")
  }

  const userData = {
    id: user.id,
    name: user.name,
    username: user.username,
    email: user.email,
    image: user.image,
    role: user.role.code,
    permissions: user.role.permissions.map(p => `${p.action}:${p.resource}`)
  }

  return (
    <div className="flex flex-col min-h-screen">
      <Header
        title={t("title")}
        description={t("subtitle")}
      />

      <main className="flex-1 p-4 md:p-8">
        <div className="max-w-4xl mx-auto space-y-8">
          <Tabs defaultValue="personal" className="w-full">
            <TabsList className="grid w-full grid-cols-4 mb-8">
              <TabsTrigger value="personal" className="gap-2 cursor-pointer">
                <User className="h-4 w-4" />
                <span className="hidden sm:inline">{tTabs("personalInfo")}</span>
              </TabsTrigger>
              <TabsTrigger value="security" className="gap-2 cursor-pointer">
                <Lock className="h-4 w-4" />
                <span className="hidden sm:inline">{tTabs("security")}</span>
              </TabsTrigger>
              <TabsTrigger value="avatar" className="gap-2 cursor-pointer">
                <ImageIcon className="h-4 w-4" />
                <span className="hidden sm:inline">{tTabs("avatar")}</span>
              </TabsTrigger>
              <TabsTrigger value="role" className="gap-2 cursor-pointer">
                <Shield className="h-4 w-4" />
                <span className="hidden sm:inline">{t("role.title")}</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="personal">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <User className="h-5 w-5" />
                    {tTabs("personalInfo")}
                  </CardTitle>
                  <CardDescription>
                    {t("personalInfo.description") || "Actualiza tu información personal"}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ProfileInfoForm user={userData} />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="security">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Lock className="h-5 w-5" />
                    {tTabs("security")}
                  </CardTitle>
                  <CardDescription>
                    {t("security.description") || "Cambia tu contraseña"}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ChangePasswordForm />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="avatar">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <ImageIcon className="h-5 w-5" />
                    {tTabs("avatar")}
                  </CardTitle>
                  <CardDescription>
                    {t("avatar.subtitle")}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <AvatarUploadSection user={userData} />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="role">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Shield className="h-5 w-5" />
                    {t("role.title")}
                  </CardTitle>
                  <CardDescription>
                    {t("role.description") || "Tu rol y permisos en el sistema"}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ProfileRoleSection user={userData} />
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  )
}
