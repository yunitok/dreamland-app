import { Header } from "@/components/layout/header"
import { setRequestLocale } from "next-intl/server"
import { requirePermission } from "@/lib/actions/rbac"
import { RagChat } from "@/modules/rag/ui/rag-chat"
import { getKBDomain } from "@/modules/rag/domain/domains"
import "@/modules/rag/domain/register-domains"

const DOMAIN = "gastrolab"

export default async function GastrolabChatPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  setRequestLocale(locale)
  await requirePermission("gastrolab", "read")

  const domainConfig = getKBDomain(DOMAIN)

  return (
    <div className="flex h-screen flex-col overflow-hidden">
      <Header
        title="Chat IA GastroLab"
        description="Asistente inteligente de cocina basado en la base de conocimiento"
        backHref="/gastrolab"
      />

      <div className="flex-1 overflow-y-auto">
        <RagChat
          domain={DOMAIN}
          headerTitle="GastroLab IA"
          headerSubtitle="Asistente de cocina e ingredientes"
          suggestedQuestions={domainConfig.suggestedQuestions}
        />
      </div>
    </div>
  )
}
