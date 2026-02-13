import { requirePermission } from "@/lib/actions/rbac"

export default async function SentimentLayout({
  children,
}: {
  children: React.ReactNode
}) {
  await requirePermission('sentiment', 'read')
  return <>{children}</>
}
